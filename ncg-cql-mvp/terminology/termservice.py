"""
Mini terminology service.

Stands in for a real FHIR terminology server ($lookup / $expand / $translate)
that a production deployment would run (e.g. Ontoserver, HAPI FHIR's
terminology module, or a hosted NRCeS service) fronting the interim NCG
code systems + the national SNOMED CT-IN / LOINC / ICD-O releases.

The interface deliberately mirrors the three FHIR terminology operations
so swapping this module for real HTTP calls to a terminology server is a
localized change, not a rewrite of the callers.
"""

from .codesystems import ALL_CODESYSTEMS


class TerminologyService:
    def __init__(self, codesystems=None):
        self.codesystems = codesystems or ALL_CODESYSTEMS

    # -- $lookup -----------------------------------------------------------
    def lookup(self, codesystem_key: str, code: str):
        """Return the concept definition for a code, or None if unknown."""
        cs = self.codesystems.get(codesystem_key)
        if not cs:
            return None
        return cs["concepts"].get(code)

    # -- $validate-code ------------------------------------------------------
    def is_valid_code(self, codesystem_key: str, code: str) -> bool:
        return self.lookup(codesystem_key, code) is not None

    # -- $expand -------------------------------------------------------------
    def expand(self, codesystem_key: str):
        """Return all codes in a code system (stand-in for a bound ValueSet)."""
        cs = self.codesystems.get(codesystem_key)
        if not cs:
            return []
        return [
            {"system": cs["system"], "code": code, "display": concept["display"]}
            for code, concept in cs["concepts"].items()
        ]

    # -- $translate ------------------------------------------------------------
    def cross_map(self, codesystem_key: str, code: str):
        """Return the illustrative SNOMED/LOINC cross-map for an interim code."""
        concept = self.lookup(codesystem_key, code)
        if not concept:
            return None
        return concept.get("cross_map")

    def to_coding(self, codesystem_key: str, code: str) -> dict:
        """Build a FHIR Coding object for a code in one of our code systems."""
        cs = self.codesystems.get(codesystem_key)
        concept = self.lookup(codesystem_key, code)
        if not cs or not concept:
            raise KeyError(f"Unknown code '{code}' in code system '{codesystem_key}'")
        return {"system": cs["system"], "code": code, "display": concept["display"]}
