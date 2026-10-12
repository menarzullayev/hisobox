"""The deployment files stay in step with the code.

A setting the application reads must be named in `deploy/production/.env.example` and handed to the
service that reads it in `deploy/production/compose.yml`; otherwise a server silently runs on a default.
The image's dependency list must be the runtime part of the lock and nothing else.
"""

import importlib.util
import re
from pathlib import Path
from types import ModuleType

import pytest

from hiso_box.infrastructure.settings import Settings

REPO = Path(__file__).resolve().parents[2]
PRODUCTION = REPO / "deploy" / "production"
BACKEND = REPO / "backend"

OWNER_URL = "HB_MIGRATION_URL"
# The SMS provider's account: the worker alone sends, so the API is never handed it.
ESKIZ = {"HB_ESKIZ_EMAIL", "HB_ESKIZ_PASSWORD", "HB_ESKIZ_SENDER"}
# The operations watch (DEC-078) runs in the worker: whom it tells and what it reads.
ALERTS = {
    "HB_ALERT_CHAT_IDS",
    "HB_ALERT_API_URL",
    "HB_ALERT_BACKUP_FIGURES_DIR",
    "HB_ALERT_FILES_FIGURES_DIR",
    "HB_ALERT_DISK_PATHS",
}
WORKER_ONLY = {"HB_WORKER_STATEMENT_TIMEOUT_MS", "HB_WORKER_DATABASE_URL"} | ESKIZ | ALERTS
# The connection of each part's own database role (migration 0031): which service may hold which.
CONNECTIONS = {
    "HB_DATABASE_URL": {"api"},
    "HB_ADMIN_DATABASE_URL": {"api"},
    "HB_WORKER_DATABASE_URL": {"worker"},
    OWNER_URL: {"migrate"},
}


def setting_names() -> set[str]:
    return {f"HB_{name.upper()}" for name in Settings.model_fields}


def assigned_names(env_text: str) -> set[str]:
    """Names assigned in an env file; a commented-out line assigns nothing."""
    return set(re.findall(r"^([A-Z][A-Z0-9_]*)=", env_text, flags=re.MULTILINE))


def missing_from(env_text: str, names: set[str]) -> set[str]:
    return names - assigned_names(env_text)


def block(compose_text: str, header: str) -> str:
    """The lines of one top-level key (`x-shared-env:`) or one service (`  api:`), without the header."""
    lines = compose_text.splitlines()
    start = lines.index(header)
    indent = len(header) - len(header.lstrip())
    body: list[str] = []
    for line in lines[start + 1 :]:
        if line.strip() and not line.lstrip().startswith("#") and len(line) - len(line.lstrip()) <= indent:
            break
        body.append(line)
    return "\n".join(body)


def handed(compose_text: str, service: str) -> set[str]:
    """The HB_ names in a service's environment, the shared group included when it is merged in."""
    own = block(compose_text, f"  {service}:")
    names = set(re.findall(r"^\s+(HB_[A-Z0-9_]+):", own, flags=re.MULTILINE))
    if "*shared-env" in own:
        shared = block(compose_text, "x-shared-env: &shared-env")
        names |= set(re.findall(r"^\s+(HB_[A-Z0-9_]+):", shared, flags=re.MULTILINE))
    return names


@pytest.fixture(scope="module")
def production_env() -> str:
    return (PRODUCTION / ".env.example").read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def compose() -> str:
    return (PRODUCTION / "compose.yml").read_text(encoding="utf-8")


def test_every_setting_is_named_in_the_production_env_example(production_env: str) -> None:
    assert missing_from(production_env, setting_names() | {OWNER_URL}) == set()


def test_a_setting_missing_from_the_env_example_is_reported(production_env: str) -> None:
    without = production_env.replace("HB_SECRETS_KEY=", "# HB_SECRETS_KEY=")
    assert missing_from(without, setting_names()) == {"HB_SECRETS_KEY"}


def test_the_production_env_example_names_nothing_the_root_one_does_not(production_env: str) -> None:
    root = assigned_names((REPO / ".env.example").read_text(encoding="utf-8"))
    ours = {name for name in assigned_names(production_env) if name.startswith("HB_")}
    assert ours - root == set()
    assert setting_names() - root == set()


def test_no_example_carries_a_value(production_env: str) -> None:
    assert re.findall(r"^[A-Z][A-Z0-9_]*=.+$", production_env, flags=re.MULTILINE) == []


def test_every_setting_reaches_the_service_that_reads_it(compose: str) -> None:
    api, worker = handed(compose, "api"), handed(compose, "worker")
    assert setting_names() - WORKER_ONLY - api == set()
    assert WORKER_ONLY - worker == set()
    # The worker's bot and file store are the API's. Its database connection is not: see below.
    shared = handed(compose, "worker") - WORKER_ONLY
    assert shared <= api
    assert {"HB_BOT_TOKEN", "HB_FILE_STORE", "HB_S3_SECRET_KEY"} <= shared


def holders(compose_text: str) -> dict[str, set[str]]:
    """For each database connection, the services that are handed it."""
    services = ("api", "worker", "migrate", "proxy")
    return {name: {service for service in services if name in handed(compose_text, service)} for name in CONNECTIONS}


def test_each_part_is_handed_the_connection_of_its_own_role_and_no_other(compose: str) -> None:
    """The worker never holds the ordinary or the administrators' connection, nor the API the worker's."""
    assert holders(compose) == CONNECTIONS
    assert {name for name in setting_names() if name.endswith("DATABASE_URL")} == set(CONNECTIONS) - {OWNER_URL}


def test_a_connection_handed_to_the_wrong_service_is_reported(compose: str) -> None:
    """The counterpart: the old arrangement, one connection shared by the API and the worker, fails."""
    shared_again = compose.replace(
        "  HB_BOT_TOKEN: ${HB_BOT_TOKEN:-}\n", "  HB_BOT_TOKEN: ${HB_BOT_TOKEN:-}\n  HB_DATABASE_URL: x\n", 1
    )
    assert shared_again != compose
    assert holders(shared_again)["HB_DATABASE_URL"] == {"api", "worker"}
    to_the_api = compose.replace(
        "      HB_WEBHOOK_SECRET: ${HB_WEBHOOK_SECRET:-}\n",
        "      HB_WEBHOOK_SECRET: ${HB_WEBHOOK_SECRET:-}\n      HB_WORKER_DATABASE_URL: x\n",
        1,
    )
    assert holders(to_the_api)["HB_WORKER_DATABASE_URL"] == {"api", "worker"}


def test_a_setting_not_handed_to_the_api_is_reported(compose: str) -> None:
    without = compose.replace("      HB_METRICS_TOKEN: ${HB_METRICS_TOKEN:-}\n", "")
    assert setting_names() - WORKER_ONLY - handed(without, "api") == {"HB_METRICS_TOKEN"}


def test_the_sms_account_goes_to_the_worker_alone(compose: str) -> None:
    assert setting_names() >= ESKIZ and handed(compose, "worker") >= ESKIZ
    for service in ("api", "migrate", "proxy"):
        assert not ESKIZ & handed(compose, service), service


def test_the_sms_account_handed_to_the_api_is_reported(compose: str) -> None:
    to_the_api = compose.replace(
        "      HB_WEBHOOK_SECRET: ${HB_WEBHOOK_SECRET:-}\n",
        "      HB_WEBHOOK_SECRET: ${HB_WEBHOOK_SECRET:-}\n      HB_ESKIZ_PASSWORD: x\n",
        1,
    )
    assert to_the_api != compose
    assert ESKIZ & handed(to_the_api, "api") == {"HB_ESKIZ_PASSWORD"}


def test_the_owner_connection_goes_to_the_migration_alone(compose: str) -> None:
    assert handed(compose, "migrate") == {OWNER_URL}
    assert OWNER_URL not in handed(compose, "api") | handed(compose, "worker") | handed(compose, "proxy")


def test_compose_asks_for_no_name_the_env_example_lacks(compose: str, production_env: str) -> None:
    asked = set(re.findall(r"\$\{([A-Z][A-Z0-9_]*)", compose))
    # The release is the commit being deployed: the scripts set it, the env file does not.
    assert asked - assigned_names(production_env) == {"DEPLOY_RELEASE"}


def test_only_the_proxy_publishes_ports(compose: str) -> None:
    for service in ("api", "worker", "migrate"):
        assert "ports:" not in block(compose, f"  {service}:")
    assert "ports:" in block(compose, "  proxy:")


# --- one API process (security review, P39-2) -----------------------------------------------------------
#
# The rate limits' counters live in the API process's memory (interface/rate_limit.py), so the limits are
# what the settings say only while one process serves the API. A second process, however it is started,
# would allow every user and every shop the full rate again.

COMPOSE_FILES = ("compose.yml", "compose.single-host.yml", "compose.local.yml")


def api_process_problems(dockerfile: str, compose_files: dict[str, str]) -> list[str]:
    """Every way the deployment files could start the API as more than one process."""
    problems: list[str] = []
    texts = {"Dockerfile": dockerfile, **compose_files}
    for name, text in texts.items():
        code = "\n".join(line for line in text.splitlines() if not line.lstrip().startswith("#"))
        if "--workers" in code:
            problems.append(f"{name}: --workers")
        # uvicorn reads this variable as its number of worker processes.
        if "WEB_CONCURRENCY" in code:
            problems.append(f"{name}: WEB_CONCURRENCY")
    for name, text in compose_files.items():
        if "  api:" not in text.splitlines():
            continue
        api = block(text, "  api:")
        for key in ("command:", "entrypoint:", "replicas:", "scale:"):
            if re.search(rf"^\s+{key}", api, flags=re.MULTILINE):
                problems.append(f"{name}: api {key}")
    return problems


@pytest.fixture(scope="module")
def api_files() -> tuple[str, dict[str, str]]:
    dockerfile = (BACKEND / "Dockerfile").read_text(encoding="utf-8")
    return dockerfile, {name: (PRODUCTION / name).read_text(encoding="utf-8") for name in COMPOSE_FILES}


def test_the_api_is_deployed_as_one_process(api_files: tuple[str, dict[str, str]]) -> None:
    dockerfile, compose_files = api_files
    assert api_process_problems(dockerfile, compose_files) == []
    # The image's own command is what runs: uvicorn, which serves with one process unless told otherwise.
    assert 'CMD ["uvicorn", "hiso_box.interface.asgi:build", "--factory"' in dockerfile
    assert any("  api:" in text.splitlines() for text in compose_files.values())


@pytest.mark.parametrize(
    ("where", "old", "new", "problem"),
    [
        (
            "Dockerfile",
            '"--no-server-header", \\',
            '"--no-server-header", "--workers", "4", \\',
            "Dockerfile: --workers",
        ),
        ("Dockerfile", "\nCMD [", "\nENV WEB_CONCURRENCY=4\nCMD [", "Dockerfile: WEB_CONCURRENCY"),
        (
            "compose.yml",
            "  api:\n",
            "  api:\n    environment:\n      WEB_CONCURRENCY: 2\n",
            "compose.yml: WEB_CONCURRENCY",
        ),
        (
            "compose.yml",
            "  api:\n",
            '  api:\n    command: ["gunicorn", "hiso_box.interface.asgi:build"]\n',
            "compose.yml: api command:",
        ),
        (
            "compose.single-host.yml",
            "  api:\n",
            "  api:\n    deploy:\n      replicas: 2\n",
            "compose.single-host.yml: api replicas:",
        ),
        ("compose.local.yml", "  api:\n", "  api:\n    scale: 2\n", "compose.local.yml: api scale:"),
    ],
    ids=["workers flag", "workers variable in the image", "workers variable", "another command", "replicas", "scale"],
)
def test_a_second_api_process_is_reported(
    api_files: tuple[str, dict[str, str]], where: str, old: str, new: str, problem: str
) -> None:
    dockerfile, compose_files = api_files
    texts = {"Dockerfile": dockerfile, **compose_files}
    assert texts[where].count(old) >= 1, "the text to change is in the file"
    texts[where] = texts[where].replace(old, new, 1)
    changed_dockerfile = texts.pop("Dockerfile")
    assert api_process_problems(changed_dockerfile, texts) == [problem]


def _runtime_requirements() -> ModuleType:
    path = BACKEND / "scripts" / "runtime_requirements.py"
    spec = importlib.util.spec_from_file_location("runtime_requirements", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_the_image_installs_the_runtime_part_of_the_lock_and_no_tools() -> None:
    module = _runtime_requirements()
    selected = module.select(
        (BACKEND / "requirements.lock").read_text(encoding="utf-8"),
        (BACKEND / "pyproject.toml").read_text(encoding="utf-8"),
    )
    names = {module.normalise(name) for name in re.findall(r"^([A-Za-z0-9._-]+)==", selected, flags=re.MULTILINE)}
    assert {"fastapi", "uvicorn", "aiogram", "sqlalchemy", "asyncpg", "alembic", "psycopg", "cryptography"} <= names
    assert {"starlette", "pydantic-core", "greenlet", "psycopg-binary"} <= names  # reached through others
    assert names & {"pytest", "ruff", "mypy", "pip-audit", "import-linter", "httpx", "pip", "setuptools"} == set()
    assert selected.count("==") == len(names)
    for entry in re.split(r"\n(?=\S)", selected.strip()):
        assert "--hash=sha256:" in entry


def test_a_runtime_dependency_absent_from_the_lock_is_refused() -> None:
    module = _runtime_requirements()
    lock = "fastapi==1.0 \\\n    --hash=sha256:00\n    # via hiso-box-backend (pyproject.toml)\n"
    pyproject = '[project]\ndependencies = ["fastapi>=0.1", "left-out>=1"]\n'
    with pytest.raises(ValueError, match="left-out"):
        module.select(lock, pyproject)


_LISTS_A_NAME = re.compile(r"docker image ls[^\n]*\|\s*grep[^\n]*hiso_box/")


def _removes_every_tag(script: str) -> bool:
    """Whether a script removes images found by listing a repository name, whatever their tag."""
    return _LISTS_A_NAME.search(script) is not None and "docker image rm $images" in script


def test_taking_the_local_stack_down_leaves_other_releases_images() -> None:
    """The local stack shares its two image names with a deployment on the same machine.

    Its teardown once removed every tag of them: on the production machine that takes the earlier
    releases a rollback starts from. It may remove the images of its own release only, and without force.
    """
    script = (REPO / "deploy/production/scripts/local.sh").read_text(encoding="utf-8")
    assert not _removes_every_tag(script)
    assert "hiso_box/backend:$RELEASE" in script and "hiso_box/proxy:$RELEASE" in script
    removal = [line for line in script.splitlines() if "docker image rm" in line]
    assert removal and all("--force" not in line and " -f " not in line for line in removal)


def test_the_check_notices_a_teardown_that_removes_every_tag() -> None:
    old = (
        "images=\"$(docker image ls --format '{{.Repository}}:{{.Tag}}' | grep -E '^hiso_box/(backend|proxy):')\"\n"
        "docker image rm $images >/dev/null\n"
    )
    assert _removes_every_tag(old)
