# lockstate.github.io

Need to make this a jekyl codebase.

## Building a tutorial

Use [Google CodeLabs As A Tool]() (`claat`) to generate tutorials from markdown.

```bash
$ mkdir new-tutorial
$ cd new-tutorial
$ claat export new-tutorial.md
ok
$ claat serve new-tutorial.md
Fetching dependencies...
Serving codelabs on localhost:9090, opening browser tab now...
```

Your tutorial will be exported to `index.html`, so `mv` it to its own name
once it's ready.

TODO: Use symlinks to avoid downloading dependencies every time
