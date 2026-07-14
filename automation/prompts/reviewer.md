Review the current uncommitted git diff without modifying files.

Phase JSON:
{{PHASE_JSON}}

Allowed files:
{{ALLOWED_FILES}}

Forbidden files:
{{FORBIDDEN_FILES}}

Changed files:
{{CHANGED_FILES}}

Internal files excluded from review:
{{INTERNAL_FILES}}

Final validation result:
{{VALIDATION_SUMMARY}}

The phase definition file is internal architectural context. It is not part of the application diff and must not be reviewed as a changed file. Only the filtered paths under Changed files may appear in filesReviewed. Do not create blockers about excluded internal artifacts.

Analyze `git diff`. Return exclusively JSON compatible with review.schema.json. Do not alter any file.
