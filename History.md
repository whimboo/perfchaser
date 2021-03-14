v0.3.0 / 2021-03-14
===================

  * Use document's URI instead of title to better identify windows (#38)
  * Refresh processes immediately when sidebar has been loaded (#37)
  * Always update history chart (#36)
  * Align font size to other sidebar panels (#35)
  * Move CPU history chart to the top of the sidebar. (#34)
  * Cache history chart properties to avoid extra calculation and layout flushes (#33)
  * Initialize details pane without triggering a click event (#31)
  * Directly access the background script from the sidebar (#29)

v0.2.1 / 2021-03-01
===================

  * Release version 0.2.1 (#20)
  * Fix extension update by usinig a JSON file (#19)
  * Fix broken links in update.rdf (#18)

v0.2 / 2021-03-01
=================

  * Release version 0.2 (#16)
  * Display history chart for system and user CPU load (#15)
  * Display kernel and cpu usage in details pane (#14)
  * Remove process name from details pane (#13)
  * Use circular buffer in background script to keep history of processes (#12)
  * Add temporary install instructions (#7)
  * Update README.md for install instructions
  * Update README.md
  * Add screenshot to README.

v0.1 / 2021-02-07
=================

  * Added XPI for nightly build..
  * Add support for extension update.
  * Disable the non-functional toolbar popup menu.
  * Set min-width for sidebar
  * Updated README for installation and development
  * Added hidden .web-extension-id file.
  * Added npm script to run the extension in Firefox.
  * Added build script.
  * Move processing of process data from Experiments API to background script.
  * Add support for listing pages of current process.
  * Add process details pane.
  * Allow output of memory usage in GB.
  * Only submit necessary process information in "process-list" message.
  * Add thread list to process details view.
  * Added details and threads panels for process info.
  * updateView has to use global variables.
  * Only sort process list for new data or updated sort settings
  * Add process details pane and process selection.
  * Simplify CSS definitions
  * Make idle processes more obvious.
  * Fallback to parent process as selected process if no content processes match.
  * Gray out idle processes in process list.
  * Highlight processes in use by currently selected tab.
  * Fix update interval timer handling.
  * Revert default update interval to 5s.
  * Allow to tweak the update interval via toolbar popup.
  * Request initial process list when sidebar gets opened.
  * Sort by CPU per default.
  * Don't capitalize process type values in sidebar.
  * Add listener for onMessage with "load" event.
  * Default to descending when switching sortable columns.
  * Use sans-serif for table entries in sidebar for better alignment.
  * Adjust column width for CPU and memory.
  * Remove parseInt from sorting given that values are numbers by default.
  * Some optimizations and initial support for sorting
  * Reduce default update interval to 5s.
  * Disable handling of threads.
  * Add how to run details to readme.
  * Add current CPU usage
  * Rename cpu total properties.
  * Add cpu total to processes and threads.
  * Return a process list instead of a hierarchical process tree.
  * Initial commit