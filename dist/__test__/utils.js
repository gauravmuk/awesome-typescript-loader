"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var fs = require("fs");
var _ = require("lodash");
var child = require("child_process");
var webpack = require("webpack");
var shelljs_1 = require("shelljs");
require('source-map-support').install();
var chai_1 = require("chai");
exports.expect = chai_1.expect;
var BPromise = require('bluebird');
var mkdirp = BPromise.promisify(require('mkdirp'));
var readFile = BPromise.promisify(fs.readFile);
var writeFile = BPromise.promisify(fs.writeFile);
exports.defaultOutputDir = path.join(process.cwd(), '.test');
exports.defaultFixturesDir = path.join(process.cwd(), 'fixtures');
var TEST_DIR = path.join(process.cwd(), '.test');
var SRC_DIR = './src';
var OUT_DIR = './out';
var WEBPACK = path.join(path.dirname(path.dirname(require.resolve('webpack'))), 'bin', 'webpack.js');
mkdirp.sync(TEST_DIR);
var LOADER = path.join(process.cwd(), 'index.js');
function entry(file) {
    return function (config) {
        config.entry.index = path.join(process.cwd(), SRC_DIR, file);
    };
}
exports.entry = entry;
function query(q) {
    return function (config) {
        _.merge(config.module.loaders.find(function (loader) {
            return loader.loader === LOADER;
        }).query, q);
    };
}
exports.query = query;
function webpackConfig() {
    var enchance = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        enchance[_i] = arguments[_i];
    }
    var config = {
        entry: { index: path.join(process.cwd(), SRC_DIR, 'index.ts') },
        output: {
            path: path.join(process.cwd(), OUT_DIR),
            filename: '[name].js'
        },
        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx']
        },
        module: {
            loaders: [
                {
                    test: /\.(tsx?|jsx?)/,
                    loader: LOADER,
                    include: [path.join(process.cwd(), SRC_DIR)],
                    query: {
                        silent: true
                    }
                }
            ]
        }
    };
    enchance.forEach(function (e) { return e(config); });
    return config;
}
exports.webpackConfig = webpackConfig;
var Exec = (function () {
    function Exec() {
        this.watchers = [];
        this._strictOutput = false;
    }
    Exec.prototype.close = function () {
        this.process.kill();
    };
    Exec.prototype.strictOutput = function () {
        this._strictOutput = true;
    };
    Exec.prototype.invoke = function (_a) {
        var _this = this;
        var stdout = _a.stdout, stderr = _a.stderr;
        this.watchers = this.watchers.filter(function (watcher) {
            var output = {
                type: stdout ? 'stdout' : 'stderr',
                data: stdout || stderr
            };
            var index = watcher.matchers.findIndex(function (m) { return m(output); });
            if (_this._strictOutput && index === -1) {
                watcher.reject(new Error("Unexpected " + output.type + ":\n" + output.data));
                return false;
            }
            watcher.matchers.splice(index, 1);
            if (watcher.matchers.length === 0) {
                watcher.resolve();
                return false;
            }
            else {
                return true;
            }
        });
    };
    Exec.prototype.wait = function () {
        var _this = this;
        var matchers = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            matchers[_i] = arguments[_i];
        }
        return new Promise(function (resolve, reject) {
            var watcher = {
                resolve: resolve,
                reject: reject,
                matchers: matchers,
            };
            _this.watchers.push(watcher);
        });
    };
    Exec.prototype.alive = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.exitCode != null) {
                resolve(_this.exitCode);
            }
            else {
                _this.process.on('exit', resolve);
            }
        });
    };
    return Exec;
}());
exports.Exec = Exec;
function streamTest(stream, test) {
    if (stream === void 0) { stream = 'stdout'; }
    var matcher;
    if (typeof test === 'string') {
        matcher = function (o) { return o.indexOf(test) !== -1; };
    }
    else if (Array.isArray(test)) {
        matcher = function (o) { return test.every(function (test) {
            if (typeof test === 'string') {
                return o.indexOf(test) !== -1;
            }
            else {
                var flag = test[0], str = test[1];
                if (flag) {
                    return o.indexOf(str) !== -1;
                }
                else {
                    return o.indexOf(str) === -1;
                }
            }
        }); };
    }
    else if (test instanceof RegExp) {
        (function (matcher) { return function (o) { return test.test(o); }; });
    }
    else {
        matcher = test;
    }
    return function (o) { return (o.type === stream) && matcher(o.data); };
}
exports.streamTest = streamTest;
exports.stdout = function (test) { return streamTest('stdout', test); };
exports.stderr = function (test) { return streamTest('stderr', test); };
function execWebpack(args) {
    return execNode(WEBPACK, args);
}
exports.execWebpack = execWebpack;
function execNode(command, args) {
    if (args === void 0) { args = []; }
    return exec('node', [command].concat(args));
}
exports.execNode = execNode;
function exec(command, args) {
    var p = shelljs_1.exec(command + " " + args.join(' '), {
        async: true
    });
    var waiter = new Exec();
    p.stdout.on('data', function (data) {
        console.log(data.toString());
        waiter.invoke({ stdout: data.toString(), stderr: null });
    });
    p.stderr.on('data', function (data) {
        console.error(data.toString());
        waiter.invoke({ stdout: null, stderr: data.toString() });
    });
    process.on('beforeExit', function () {
        p.kill();
    });
    process.on('exit', function (code) {
        waiter.exitCode = code;
        p.kill();
    });
    waiter.process = p;
    return waiter;
}
exports.exec = exec;
function expectErrors(stats, count, errors) {
    if (errors === void 0) { errors = []; }
    stats.compilation.errors.every(function (err) {
        var str = err.toString();
        chai_1.expect(errors.some(function (e) { return str.indexOf(e) !== -1; }), 'Error is not covered: \n' + str).true;
    });
    chai_1.expect(stats.compilation.errors.length).eq(count);
}
exports.expectErrors = expectErrors;
function expectWarnings(stats, count, warnings) {
    if (warnings === void 0) { warnings = []; }
    stats.compilation.warnings.every(function (warn) {
        var str = warn.toString();
        chai_1.expect(warnings.some(function (e) { return str.indexOf(e) !== -1; }), 'Warning is not covered: \n' + str).true;
    });
    chai_1.expect(stats.compilation.warnings.length).eq(count);
}
exports.expectWarnings = expectWarnings;
function tsconfig(compilerOptions, config, fileName) {
    if (fileName === void 0) { fileName = 'tsconfig.json'; }
    var res = _.merge({
        compilerOptions: _.merge({
            target: 'es6',
            moduleResolution: 'node',
            typeRoots: [
                './node_modules/@types'
            ]
        }, compilerOptions)
    }, config);
    return file(fileName, json(res));
}
exports.tsconfig = tsconfig;
function install() {
    var name = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        name[_i] = arguments[_i];
    }
    return child.execSync("yarn add " + name.join(' '));
}
exports.install = install;
function json(obj) {
    return JSON.stringify(obj, null, 4);
}
exports.json = json;
function checkOutput(fileName, fragment) {
    var source = readOutput(fileName);
    if (!source) {
        process.exit();
    }
    chai_1.expect(source.replace(/\s/g, '')).include(fragment.replace(/\s/g, ''));
}
exports.checkOutput = checkOutput;
function readOutput(fileName) {
    return fs.readFileSync(path.join(OUT_DIR, fileName || 'index.js')).toString();
}
exports.readOutput = readOutput;
function touchFile(fileName) {
    return readFile(fileName)
        .then(function (buf) { return buf.toString(); })
        .then(function (source) { return writeFile(fileName, source); });
}
exports.touchFile = touchFile;
function compile(config) {
    return new Promise(function (resolve, reject) {
        var compiler = webpack(config);
        compiler.run(function (err, stats) {
            if (err) {
                reject(err);
            }
            else {
                resolve(stats);
            }
        });
    });
}
exports.compile = compile;
function spec(name, cb, disable) {
    if (disable === void 0) { disable = false; }
    var runner = function (done) {
        var temp = path.join(TEST_DIR, path.basename(name).replace('.', '') + '-' +
            (new Date()).toTimeString()
                .replace(/.*(\d{2}:\d{2}:\d{2}).*/, "$1")
                .replace(/:/g, "-"));
        mkdirp.sync(temp);
        var cwd = process.cwd();
        process.chdir(temp);
        pkg();
        var env = {
            TEST_DIR: TEST_DIR,
            OUT_DIR: OUT_DIR,
            SRC_DIR: SRC_DIR,
            LOADER: LOADER,
            WEBPACK: WEBPACK
        };
        var promise = cb.call(this, env, done);
        return promise
            .then(function (a) {
            process.chdir(cwd);
            return a;
        })
            .catch(function (e) {
            process.chdir(cwd);
            throw e;
        });
    };
    var asyncRunner = cb.length === 2
        ? function (done) { runner.call(this, done).catch(done); return; }
        : function () { return runner.call(this); };
    if (disable) {
        xit(name, asyncRunner);
    }
    else {
        it(name, asyncRunner);
    }
}
exports.spec = spec;
function xspec(name, cb) {
    return spec(name, cb, true);
}
exports.xspec = xspec;
function watch(config, cb) {
    var compiler = webpack(config);
    var watch = new Watch();
    var webpackWatcher = compiler.watch({}, function (err, stats) {
        watch.invoke(err, stats);
        if (cb) {
            cb(err, stats);
        }
    });
    watch.close = webpackWatcher.close;
    return watch;
}
exports.watch = watch;
var Watch = (function () {
    function Watch() {
        this.resolves = [];
    }
    Watch.prototype.invoke = function (err, stats) {
        this.resolves.forEach(function (_a) {
            var resolve = _a.resolve, reject = _a.reject;
            if (err) {
                reject(err);
            }
            else {
                resolve(stats);
            }
        });
        this.resolves = [];
    };
    Watch.prototype.wait = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.resolves.push({ resolve: resolve, reject: reject });
        });
    };
    return Watch;
}());
exports.Watch = Watch;
function pkg() {
    file('package.json', "\n        {\n            \"name\": \"test\",\n            \"license\": \"MIT\"\n        }\n    ");
}
exports.pkg = pkg;
function src(fileName, text) {
    return new Fixture(path.join(SRC_DIR, fileName), text);
}
exports.src = src;
function file(fileName, text) {
    return new Fixture(fileName, text);
}
exports.file = file;
var Fixture = (function () {
    function Fixture(fileName, text) {
        this.text = text;
        this.fileName = fileName;
        mkdirp.sync(path.dirname(this.fileName));
        fs.writeFileSync(this.fileName, text);
    }
    Fixture.prototype.path = function () {
        return this.fileName;
    };
    Fixture.prototype.toString = function () {
        return this.path();
    };
    Fixture.prototype.touch = function () {
        touchFile(this.fileName);
    };
    Fixture.prototype.update = function (updater) {
        var newText = updater(this.text);
        this.text = newText;
        fs.writeFileSync(this.fileName, newText);
    };
    Fixture.prototype.remove = function () {
        fs.unlinkSync(this.fileName);
    };
    return Fixture;
}());
exports.Fixture = Fixture;
//# sourceMappingURL=utils.js.map