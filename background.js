const DEFAULT_ENABLED_TAGS = [
  "CODE_UNIT_STARTED",
  "CODE_UNIT_FINISHED",
  "METHOD_ENTRY",
  "METHOD_EXIT",
  "VARIABLE_ASSIGNMENT",
  "USER_DEBUG",
  "DML_BEGIN",
  "DML_END",
  "SOQL_EXECUTE_BEGIN",
  "EXCEPTION_THROWN",
  "SOQL_EXECUTE_END",
  "CALLOUT_REQUEST",
  "CALLOUT_RESPONSE"
];

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      enabledTags: DEFAULT_ENABLED_TAGS
    });
  }
});
