"""
Centralized, single-source rendering for startup/logging output.

Goals (per project standard):
- Print config banners only once (master process).
- Color-coded logs.
- Clean startup banner, service table, task summary.
- Mask sensitive values.
"""

from __future__ import annotations

import logging
import multiprocessing
import os
import platform
import socket
from collections import defaultdict
from datetime import datetime
from typing import Iterable, Mapping, Sequence

try:
    from rich import box
    from rich.console import Console
    from rich.panel import Panel
    from rich.table import Table
    from rich.logging import RichHandler

    HAVE_RICH = True
    console = Console(force_terminal=True)
except ModuleNotFoundError:
    # Graceful fallback to plain output (colorless) if rich isn't installed.
    from colorama import Fore, Style, init as colorama_init
    import textwrap

    HAVE_RICH = False
    colorama_init()
    console = None  # not used in fallback path


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def is_primary_process() -> bool:
    """Return True only for the main controlling process (not forked workers)."""
    proc_name = multiprocessing.current_process().name
    return proc_name == "MainProcess" and os.environ.get("FORKED_BY_MULTIPROCESSING") != "1"


def mask_secret(value: str | None, visible: int = 4) -> str:
    if not value:
        return "None"
    value = str(value)
    if len(value) <= visible:
        return "•" * len(value)
    return "•" * max(0, len(value) - visible) + value[-visible:]


def _status_chip(label: str, color: str) -> str:
    if HAVE_RICH:
        return f"[{color}]{label}[/{color}]"
    from colorama import Fore, Style

    color_map = {
        "green": Fore.GREEN,
        "yellow": Fore.YELLOW,
        "red": Fore.RED,
        "cyan": Fore.CYAN,
        "grey50": Fore.WHITE,
    }
    return f"{color_map.get(color, Fore.WHITE)}{label}{Style.RESET_ALL}"


# ---------------------------------------------------------------------------
# Logging configuration
# ---------------------------------------------------------------------------
def setup_color_logging(level: int = logging.INFO) -> None:
    """
    Install a Rich handler with a concise, color-coded format and
    demote noisy spawn logs to DEBUG/hidden.
    """
    # Demote spawn chatter (e.g., "child process 12345 calling self.run()")
    logging.getLogger("billiard.pool").setLevel(logging.WARNING)

    handler: logging.Handler
    formatter = logging.Formatter(
        fmt="%(asctime)s %(levelname)-8s %(processName)-12s %(message)s",
        datefmt="[%H:%M:%S]",
    )

    if HAVE_RICH:
        handler = RichHandler(
            show_time=True,
            show_level=True,
            show_path=False,
            markup=True,
            rich_tracebacks=False,
        )
        handler.setFormatter(formatter)
    else:
        handler = logging.StreamHandler()
        handler.setFormatter(formatter)

    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level)
    root.addHandler(handler)


# ---------------------------------------------------------------------------
# Render blocks
# ---------------------------------------------------------------------------
def print_startup_banner(environment: str, started_at: datetime | None = None, host: str | None = None) -> None:
    if not is_primary_process():
        return

    started_at = started_at or datetime.now()
    host = host or socket.gethostname()
    if HAVE_RICH:
        panel = Panel(
            f"\n[bold white]CHURCH DIGITAL ENGAGEMENT PLATFORM — BACKEND[/bold white]\n"
            f"[cyan]Environment :[/cyan] {environment.upper()}\n"
            f"[cyan]Started At  :[/cyan] {started_at.strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"[cyan]Host       :[/cyan] {host} ({platform.system()} {platform.release()})\n",
            box=box.DOUBLE,
            padding=(1, 2),
            style="bold white",
        )
        console.print(panel)
    else:
        top = "╔" + "═" * 66 + "╗"
        bottom = "╚" + "═" * 66 + "╝"
        print(Fore.CYAN + Style.BRIGHT + top + Style.RESET_ALL)
        print(Fore.CYAN + "║ " + Style.BRIGHT + "CHURCH DIGITAL ENGAGEMENT PLATFORM — BACKEND".ljust(64) + "║" + Style.RESET_ALL)
        print(Fore.CYAN + "║ " + Style.NORMAL + f"Environment : {environment.upper()}".ljust(64) + "║" + Style.RESET_ALL)
        print(Fore.CYAN + "║ " + Style.NORMAL + f"Started At  : {started_at.strftime('%Y-%m-%d %H:%M:%S')}".ljust(64) + "║" + Style.RESET_ALL)
        print(Fore.CYAN + "║ " + Style.NORMAL + f"Host        : {host} ({platform.system()} {platform.release()})".ljust(64) + "║" + Style.RESET_ALL)
        print(Fore.CYAN + Style.BRIGHT + bottom + Style.RESET_ALL)


def print_service_table(services: Sequence[Mapping[str, str]]) -> None:
    if not is_primary_process():
        return

    if HAVE_RICH:
        table = Table(
            title="Service Initialization",
            box=box.SIMPLE_HEAVY,
            header_style="bold white",
            show_lines=False,
        )
        table.add_column("Service", style="white")
        table.add_column("Status", style="white")
        table.add_column("Details", style="white")

        for svc in services:
            table.add_row(
                svc.get("service", ""),
                svc.get("status", ""),
                svc.get("details", ""),
            )

        console.print(table)
    else:
        print(Fore.WHITE + Style.BRIGHT + "\n┌" + "─" * 29 + "┬" + "─" * 10 + "┬" + "─" * 26 + "┐" + Style.RESET_ALL)
        print(Fore.WHITE + Style.BRIGHT + f"│ {'Service':<27} │ {'Status':<8} │ {'Details':<24} │" + Style.RESET_ALL)
        print(Fore.WHITE + Style.BRIGHT + "├" + "─" * 29 + "┼" + "─" * 10 + "┼" + "─" * 26 + "┤" + Style.RESET_ALL)
        for svc in services:
            status = svc.get("status", "")
            print(Fore.WHITE + f"│ {svc.get('service',''):<27} │ {status:<8} │ {svc.get('details',''):<24} │" + Style.RESET_ALL)
        print(Fore.WHITE + Style.BRIGHT + "└" + "─" * 29 + "┴" + "─" * 10 + "┴" + "─" * 26 + "┘" + Style.RESET_ALL)


def print_task_summary(task_names: Iterable[str]) -> None:
    if not is_primary_process():
        return

    domains: dict[str, list[str]] = defaultdict(list)
    for name in sorted(task_names):
        parts = name.split(".")
        domain = ""
        if len(parts) >= 2 and parts[0] == "apps":
            domain = parts[1]
        elif parts:
            domain = parts[0]
        domains[domain or "misc"].append(parts[-1] if parts else name)

    total = sum(len(v) for v in domains.values())
    if HAVE_RICH:
        console.print(f"\n:clipboard: [bold]REGISTERED TASK DOMAINS ({total} tasks)[/bold]")
        for idx, (domain, tasks) in enumerate(sorted(domains.items()), start=1):
            prefix = "└──" if idx == len(domains) else "├──"
            console.print(f"  {prefix} {domain:<14} → {', '.join(tasks)}")
    else:
        print(Fore.WHITE + Style.BRIGHT + f"\nREGISTERED TASK DOMAINS ({total} tasks)" + Style.RESET_ALL)
        for idx, (domain, tasks) in enumerate(sorted(domains.items()), start=1):
            prefix = "└──" if idx == len(domains) else "├──"
            print(f"  {prefix} {domain:<14} -> {', '.join(tasks)}")


def print_email_config_block(*, backend: str, host: str, port: int, user: str, default_from: str, password: str | None, use_tls: bool) -> None:
    if not is_primary_process():
        return

    masked_pwd = mask_secret(password) if password else "No / Not Set"
    if HAVE_RICH:
        table = Table(box=box.MINIMAL_HEAVY_HEAD, show_header=False, padding=(0, 1))
        table.add_row(":wrench:  [bold grey50]EMAIL CONFIGURATION[/bold grey50]", "")
        table.add_row("Backend", backend)
        table.add_row("Host", f"{host}:{port}")
        table.add_row("User", user or "—")
        table.add_row("From", default_from)
        table.add_row("Password", masked_pwd)
        table.add_row("TLS", "True" if use_tls else "False")
        console.print(table)
    else:
        print(Fore.WHITE + Style.BRIGHT + "\nEMAIL CONFIGURATION" + Style.RESET_ALL)
        print(f"  Backend : {backend}")
        print(f"  Host    : {host}:{port}")
        print(f"  User    : {user or '—'}")
        print(f"  From    : {default_from}")
        print(f"  Password: {masked_pwd}")
        print(f"  TLS     : {'True' if use_tls else 'False'}")


def print_ready_line(worker_name: str) -> None:
    if not is_primary_process():
        return
    msg = f":rocket:  {worker_name} is LIVE — awaiting tasks   [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]"
    if HAVE_RICH:
        console.print(msg, style="bold green")
    else:
        print(msg)


# Convenience aggregator for Celery startup
def render_celery_startup(app, *, environment: str, broker_url: str, result_backend: str, email_conf: dict, worker_concurrency: int | None = None) -> None:
    """
    Render banner + tables + task summary for Celery worker startup.
    """
    print_startup_banner(environment=environment)

    # Service table
    services = [
        {"service": "Django App", "status": _status_chip("✅ READY", "green"), "details": ""},
        {"service": "Redis Broker", "status": _status_chip("✅ READY", "green"), "details": broker_url},
        {"service": "Redis Results Backend", "status": _status_chip("✅ READY", "green"), "details": result_backend},
        {"service": "Email (SMTP)", "status": _status_chip("✅ READY", "green"), "details": f"{email_conf.get('host')}:{email_conf.get('port')}"},
        {"service": "Celery Workers", "status": _status_chip("✅ READY", "green"), "details": f"{worker_concurrency or 'auto'} workers"},
        {"service": "Notification Service", "status": _status_chip("⚠️ CHECK", "yellow"), "details": "Confirm tasks firing"},
    ]
    print_service_table(services)

    # Email block (single-print rule)
    print_email_config_block(
        backend=email_conf.get("backend", ""),
        host=email_conf.get("host", ""),
        port=int(email_conf.get("port", 0) or 0),
        user=email_conf.get("user", ""),
        default_from=email_conf.get("default_from", ""),
        password=email_conf.get("password"),
        use_tls=bool(email_conf.get("use_tls", False)),
    )

    print_task_summary(app.tasks.keys())
