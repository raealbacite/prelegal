"""Template registry: the catalog of supported legal documents and the fill-in
fields auto-derived from each template.

The 12 documents live in ``templates/*.md`` (Common Paper contract language) and
are listed in ``catalog.json`` at the repo root. Fillable fields are marked in
the templates with ``<span class="..._link">Label</span>`` tags (coverpage_link,
orderform_link, keyterms_link, businessterms_link, sow_link). We scan those tags
to derive the field list for every document except the Mutual NDA, whose fields
are declared explicitly so the polished bespoke NDA renderer keeps working.

The registry is built once and cached; :func:`init_registry` warms it at startup
so a missing template or catalog entry fails fast rather than on first chat.
"""

from __future__ import annotations

import json
import os
import re
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel

BACKEND_ROOT = Path(__file__).resolve().parent.parent
# templates/ and catalog.json sit at the repo root, one level above backend/.
# Overridable so tests (and the Docker image layout) can point elsewhere.
REPO_ROOT = Path(os.environ.get("PRELEGAL_REPO_ROOT", BACKEND_ROOT.parent))
CATALOG_PATH = REPO_ROOT / "catalog.json"
TEMPLATES_DIR = REPO_ROOT / "templates"

MNDA_FILENAME = "mutual-nda.md"
MNDA_COVERPAGE_FILENAME = "mutual-nda-coverpage.md"
# Both NDA catalog entries are drafted as one combined document by the bespoke
# NDA renderer, keyed on the canonical MNDA filename.
MNDA_FILENAMES = frozenset({MNDA_FILENAME, MNDA_COVERPAGE_FILENAME})

_LINK_SPAN_RE = re.compile(r'<span class="[A-Za-z]+_link"[^>]*>(.*?)</span>', re.DOTALL)


class TemplateVariable(BaseModel):
    name: str
    description: str | None = None


class DocumentTemplate(BaseModel):
    filename: str
    name: str
    description: str
    variables: list[TemplateVariable]
    markdown: str


# The Mutual NDA keeps the hand-authored field set its bespoke renderer expects,
# rather than the auto-derived one, so its structured term/party fields survive.
# Keys mirror the flattened NDAFormData shape on the frontend (dotted for parties).
_MNDA_VARIABLES: list[TemplateVariable] = [
    TemplateVariable(name="partyA.companyName", description="Party A's company/legal name."),
    TemplateVariable(name="partyA.printName", description="Name of the person signing for Party A."),
    TemplateVariable(name="partyA.title", description="Job title of Party A's signer."),
    TemplateVariable(name="partyA.noticeAddress", description="Party A's address for legal notices."),
    TemplateVariable(name="partyB.companyName", description="Party B's company/legal name."),
    TemplateVariable(name="partyB.printName", description="Name of the person signing for Party B."),
    TemplateVariable(name="partyB.title", description="Job title of Party B's signer."),
    TemplateVariable(name="partyB.noticeAddress", description="Party B's address for legal notices."),
    TemplateVariable(name="purpose", description="What the parties will use the confidential information for."),
    TemplateVariable(name="effectiveDate", description='The start date, as an ISO date "YYYY-MM-DD".'),
    TemplateVariable(
        name="mndaTermType",
        description='Either "duration" (the MNDA expires after a set time) or "untilTerminated".',
    ),
    TemplateVariable(
        name="mndaTermDuration",
        description='e.g. "2 year(s)" — only meaningful when mndaTermType is "duration".',
    ),
    TemplateVariable(
        name="confidentialityTermType",
        description='Either "duration" or "perpetual".',
    ),
    TemplateVariable(
        name="confidentialityTermDuration",
        description='e.g. "3 year(s)" — only meaningful when confidentialityTermType is "duration".',
    ),
    TemplateVariable(name="governingLaw", description='A US state, e.g. "Delaware".'),
    TemplateVariable(
        name="jurisdiction",
        description='The courts, e.g. "New Castle County, Delaware".',
    ),
    TemplateVariable(name="modifications", description="Optional free-text changes to the standard terms."),
]


def _normalize_label(raw: str) -> str:
    """Turn the inner text of a variable span into a clean field label."""
    text = raw.replace("**", "").strip()
    text = text.strip("\"'“”‘’")
    for suffix in ("’s", "'s", "’", "'"):  # trailing possessive
        if text.endswith(suffix):
            text = text[: -len(suffix)]
            break
    return re.sub(r"\s+", " ", text).strip()


def resolve_variable_name(label: str, known_lower: set[str]) -> str:
    """Map a raw label to its canonical field name.

    Collapses a trailing plural to its singular form when the singular also
    appears as a variable (e.g. "Subscription Periods" -> "Subscription Period"),
    so the same underlying field is not split across two keys. This rule is
    mirrored on the frontend so span substitution agrees with extraction.
    """
    if label.endswith("s"):
        singular = label[:-1]
        if singular.lower() in known_lower:
            return singular
    return label


def _extract_variables(markdown: str) -> list[TemplateVariable]:
    labels: list[str] = []
    seen: set[str] = set()
    for match in _LINK_SPAN_RE.finditer(markdown):
        label = _normalize_label(match.group(1))
        if not label or label.lower() in seen:
            continue
        seen.add(label.lower())
        labels.append(label)

    known_lower = {label.lower() for label in labels}
    canonical: list[TemplateVariable] = []
    added: set[str] = set()
    for label in labels:
        name = resolve_variable_name(label, known_lower)
        if name.lower() in added:
            continue
        added.add(name.lower())
        canonical.append(TemplateVariable(name=name))
    return canonical


@lru_cache(maxsize=1)
def load_registry() -> dict[str, DocumentTemplate]:
    """Load the catalog and parse every template. Cached after the first call."""
    entries = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    registry: dict[str, DocumentTemplate] = {}
    for entry in entries:
        filename = entry["filename"]
        markdown = (TEMPLATES_DIR / filename).read_text(encoding="utf-8")
        variables = (
            _MNDA_VARIABLES if filename == MNDA_FILENAME else _extract_variables(markdown)
        )
        registry[filename] = DocumentTemplate(
            filename=filename,
            name=entry["name"],
            description=entry["description"],
            variables=variables,
            markdown=markdown,
        )
    return registry


def init_registry() -> None:
    """Warm the registry at startup so bad templates fail fast."""
    load_registry()


def get_document(filename: str) -> DocumentTemplate | None:
    return load_registry().get(filename)


def catalog_summary() -> str:
    """A bulleted 'name: description' listing of all supported documents,
    embedded in the system prompt so the assistant knows exactly what it can
    (and cannot) produce."""
    lines = [
        f"- {doc.name} (filename: {doc.filename}): {doc.description}"
        for doc in load_registry().values()
    ]
    return "\n".join(lines)
