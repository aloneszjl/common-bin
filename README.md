# yargs-common-bin

[![NPM version][npm-image]][npm-url]

[npm-image]: https://img.shields.io/npm/v/common-bin.svg?style=flat-square
[npm-url]: https://npmjs.org/package/yargs-common-bin

Abstraction bin tool wrap [yargs](http://yargs.js.org/), to provide more convenient usage, support async / generator.

---

## Install

```bash
$ npm i yargs-common-bin --save
```

## Build a bin tool for your team

You maybe need a custom xxx-bin to implement more custom features.

Now you can implement a [Command](lib/command.js) sub class to do that.

### Example: Write your own `git` command

This example will show you how to create a new `my-git` tool.

- Full demo: [my-git](test/fixtures/my-git)

```bash
test/fixtures/my-git
├── bin
│   └── my-git.js
├── command
│   ├── remote
│   │   ├── add.js
│   │   └── remove.js
│   ├── clone.js
│   └── remote.js
├── index.js
└── package.json
```

#### [my-git.js](test/fixtures/my-git/bin/my-git.js)

```js
#!/usr/bin/env node

'use strict';

const Command = require('..');
new Command().start();
```

#### [Main Command](test/fixtures/my-git/index.js)

Just extend `Command`, and use as your bin start point.

You can use `this.yargs` to custom yargs config, see http://yargs.js.org/docs for more detail.

```js
const Command = require('yargs-common-bin');
const pkg = require('./package.json');

class MainCommand extends Command {
  constructor(rawArgv) {
    super(rawArgv);
    this.usage = 'Usage: my-git <command> [options]';

    // load entire command directory
    this.load(path.join(__dirname, 'command'));

    // or load special command file
    // this.add(path.join(__dirname, 'test_command.js'));

    // more custom with `yargs` api, such as you can use `my-git -V`
    this.yargs.alias('V', 'version');
  }
}

module.exports = MainCommand;
```

#### [CloneCommand](test/fixtures/my-git/command/clone.js)

```js
const Command = require('yargs-common-bin');
class CloneCommand extends Command {
  constructor(rawArgv) {
    super(rawArgv);

    this.options = {
      depth: {
        type: 'number',
        description: 'Create a shallow clone with a history truncated to the specified number of commits',
      },
    });
  }

  * run({ argv }) {
    console.log('git clone %s to %s with depth %d', argv._[0], argv._[1], argv.depth);
  }

  get description() {
    return 'Clone a repository into a new directory';
  }

  get aliases() {
    return ['command-aliases', 'ca']
  }
}

module.exports = CloneCommand;
```

#### Run result

```bash
$ my-git clone gh://node-modules/common-bin dist --depth=1

git clone gh://node-modules/common-bin to dist with depth 1
```

## Concept

### Command

Define the main logic of command

**Method:**

- `start()` - start your program, only use once in your bin file.
- `run(context)`
  - should implement this to provide command handler, will exec when not found sub command.
  - Support generator / async function / normal function which return promise.
  - `context` is `{ cwd, env, argv, rawArgv }`
    - `cwd` - `process.cwd()`
    - `env` - clone env object from `process.env`
    - `argv` - argv parse result by yargs, `{ _: [ 'start' ], '$0': '/usr/local/bin/common-bin', baseDir: 'simple'}`
    - `rawArgv` - the raw argv, `[ "--baseDir=simple" ]`
- `load(fullPath)` - register the entire directory to commands
- `add(name, target)` - register special command with command name, `target` could be full path of file or Class.
- `showHelp()` - print usage message to console.
- `options=` - a setter, shortcut for `yargs.options`
- `usage=` - a setter, shortcut for `yargs.usage`

**Properties:**

- `description` - {String} a getter, only show this description when it's a sub command in help console
- `helper` - {Object} helper instance
- `yargs` - {Object} yargs instance for advanced custom usage
- `options` - {Object} a setter, set yargs' options
- `version` - {String} customize version, can be defined as a getter to support lazy load.
- `aliases` - {Array<String>} current command aliases
- `parserOptions` - {Object} control `context` parse rule.
  - `execArgv` - {Boolean} whether extract `execArgv` to `context.execArgv`
  - `removeAlias` - {Boolean} whether remove alias key from `argv`
  - `removeCamelCase` - {Boolean} whether remove camel case key from `argv`

You can define options by set `this.options`

```js
this.options = {
  baseDir: {
    alias: 'b',
    demandOption: true,
    description: 'the target directory',
    coerce: str => path.resolve(prcess.cwd(), str),
  },
  depth: {
    description: 'level to clone',
    type: 'number',
    default: 1,
  },
  size: {
    description: 'choose a size',
    choices: ['xs', 's', 'm', 'l', 'xl'],
  },
};
```

You can define version by define `this.version` getter:

```js
get version() {
  return 'v1.0.0';
}
```

### Helper

- `forkNode(modulePath, args, opt)` - fork child process, wrap with promise and gracefull exit
- `spawn(cmd, args, opt)` - spawn a new process, wrap with promise and gracefull exit
- `npmInstall(npmCli, name, cwd)` - install node modules, wrap with promise
- `* callFn(fn, args, thisArg)` - call fn, support gernerator / async / normal function return promise
- `unparseArgv(argv, opts)` - unparse argv and change it to array style

**Extend Helper**

```js
// index.js
const Command = require('yargs-common-bin');
const helper = require('./helper');
class MainCommand extends Command {
  constructor(rawArgv) {
    super(rawArgv);

    // load sub command
    this.load(path.join(__dirname, 'command'));

    // custom helper
    Object.assign(this.helper, helper);
  }
}
```

## Advanced Usage

### Single Command

Just need to provide `options` and `run()`.

```js
const Command = require('yargs-common-bin');
class MainCommand extends Command {
  constructor(rawArgv) {
    super(rawArgv);
    this.options = {
      baseDir: {
        description: 'target directory',
      },
    };
  }

  *run(context) {
    console.log('run default command at %s', context.argv.baseDir);
  }
}
```

### Sub Command

Also support sub command such as `my-git remote add <name> <url> --tags`.

```js
// test/fixtures/my-git/command/remote.js
class RemoteCommand extends Command {
  constructor(rawArgv) {
    // DO NOT forgot to pass params to super
    super(rawArgv);
    // load sub command for directory
    this.load(path.join(__dirname, 'remote'));
  }

  *run({ argv }) {
    console.log('run remote command with %j', argv._);
  }

  get description() {
    return 'Manage set of tracked repositories';
  }
}

// test/fixtures/my-git/command/remote/add.js
class AddCommand extends Command {
  constructor(rawArgv) {
    super(rawArgv);

    this.options = {
      tags: {
        type: 'boolean',
        default: false,
        description: 'imports every tag from the remote repository',
      },
    };
  }

  *run({ argv }) {
    console.log(
      'git remote add %s to %s with tags=%s',
      argv.name,
      argv.url,
      argv.tags,
    );
  }

  get description() {
    return 'Adds a remote named <name> for the repository at <url>';
  }
}
```

see [remote.js](test/fixtures/my-git/command/remote.js) for more detail.

### Async Support

```js
class SleepCommand extends Command {
  async run() {
    await sleep('1s');
    console.log('sleep 1s');
  }

  get description() {
    return 'sleep showcase';
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

see [async-bin](test/fixtures/async-bin) for more detail.
