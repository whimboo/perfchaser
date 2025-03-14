# PerfChaser
The extension lets you examine the resource usage of Firefox. It tracks the
CPU load and memory usage of each used process. Hereby the currently used
resources are displayed in a sidebar, on for each window.

Please note that the extension is still in early development. That means
feedback for noticable issues, or missing features is wanted.

![PerfChaser screenshot](docs/images/perfchaser.png)

# Install
Because PerfChaser makes use of
[WebExtension Experiments](https://webextensions-experiments.readthedocs.io)
it **cannot** be signed by [addons.mozilla.org](https://addons.mozilla.org).

As such the following preferences have to be set via `about:config`
**before** installing the XPI:

* `xpinstall.signatures.required` = `false`
* `extensions.experiments.enabled` = `true`

Afterward the extension can be installed via `about:addons` by clicking the
gear icon, and selecting `Install Add-on From File`, or by dragging XPI onto
a browser window.

Note that only Firefox Nightly and Firefox Developer Edition support the
installation of WebExtension Experiments.

## Temporary Installation
In case you want to just test the extension without having it permanently
installed open `about:debugging` and select `This Nightly` or `This Firefox`
on the left side. From there you can select the `src/manifest.json` file via
`Load Temporary Add-on...`.

Note that you also have to set `extensions.experiments.enabled` to `true` first,
but no changes to `xpinstall.signatures.required` are required. Now the extension
will kept installed until Firefox gets closed or restarted.

# Contribution
Everyone is welcome to contribute to the project. It doesn't matter if it's as
a user of the extension and reporting issues, or when you want to even fix bugs
and implement new features.

# Development
When modifying the code of the extension it is adviced to make use of the
[web-ext Node.js package](https://www.npmjs.com/package/web-ext). Running
Firefox through it will make sure that changes to the code are automatically
picked-up, and the extension reloaded in the current Firefox instance.

Use the following command to start Firefox Nightly with the extension running:

    npm run start:firefox -- --firefox=nightly

## Building the XPI
There is also a npm script that builds the XPI file:

    npm run build

Note: Due to the above restrictions signing the extension is not possible yet.
