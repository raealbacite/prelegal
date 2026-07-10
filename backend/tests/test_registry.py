import json

from app.registry import (
    MNDA_FILENAME,
    TemplateVariable,
    _extract_variables,
    _normalize_label,
    catalog_summary,
    get_document,
    load_registry,
    resolve_variable_name,
)


def test_registry_loads_every_catalog_entry():
    from app.registry import CATALOG_PATH

    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    registry = load_registry()
    assert set(registry) == {entry["filename"] for entry in catalog}


def test_mnda_uses_explicit_structured_fields():
    doc = get_document(MNDA_FILENAME)
    assert doc is not None
    names = {v.name for v in doc.variables}
    # The bespoke NDA renderer depends on these exact flattened keys.
    assert "partyA.companyName" in names
    assert "mndaTermType" in names
    assert "confidentialityTermDuration" in names


def test_csa_fields_are_auto_derived_from_spans():
    doc = get_document("csa.md")
    assert doc is not None
    names = {v.name for v in doc.variables}
    assert "Customer" in names
    assert "Provider" in names
    assert "Subscription Period" in names
    # Possessive/plural variants must not create duplicate fields.
    assert "Customer's" not in names
    assert "Subscription Periods" not in names


def test_get_document_returns_none_for_unknown():
    assert get_document("does-not-exist.md") is None


def test_catalog_summary_lists_documents():
    summary = catalog_summary()
    assert "Cloud Service Agreement" in summary
    assert "mutual-nda.md" in summary


def test_normalize_label_strips_markup_and_possessive():
    assert _normalize_label("**Provider’s**") == "Provider"
    assert _normalize_label('"Customer"') == "Customer"
    assert _normalize_label("Target   Uptime") == "Target Uptime"


def test_resolve_variable_name_collapses_known_plural():
    known = {"subscription period", "subscription periods"}
    assert resolve_variable_name("Subscription Periods", known) == "Subscription Period"
    # A plural with no singular counterpart is left alone.
    assert resolve_variable_name("Fees", {"fees"}) == "Fees"


def test_extract_variables_dedupes_and_orders():
    markdown = (
        '<span class="coverpage_link">Provider</span> and '
        '<span class="coverpage_link">Provider’s</span> agree with '
        '<span class="keyterms_link">Customer</span>. '
        '<span class="header_2" id="1">Not A Field</span>'
    )
    variables = _extract_variables(markdown)
    names = [v.name for v in variables]
    assert names == ["Provider", "Customer"]
    assert all(isinstance(v, TemplateVariable) for v in variables)
