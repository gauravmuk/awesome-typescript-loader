/// <reference types="webpack" />
/// <reference types="node" />
import * as child from 'child_process';
import * as webpack from 'webpack';
import { LoaderConfig } from '../interfaces';
import { expect } from 'chai';
export { expect };
export declare const defaultOutputDir: string;
export declare const defaultFixturesDir: string;
export interface ConfigOptions {
    loaderQuery?: LoaderConfig;
    watch?: boolean;
    include?: (string | RegExp)[];
    exclude?: (string | RegExp)[];
}
export declare function entry(file: string): (config: any) => void;
export declare function query(q: any): (config: any) => void;
export declare function webpackConfig(...enchance: any[]): webpack.Configuration;
export interface Output {
    type: 'stderr' | 'stdout';
    data: string;
}
export declare type OutputMatcher = (o: Output) => boolean;
export declare class Exec {
    process: child.ChildProcess;
    watchers: {
        resolve: any;
        reject: any;
        matchers: OutputMatcher[];
    }[];
    exitCode: number | null;
    private _strictOutput;
    close(): void;
    strictOutput(): void;
    invoke({stdout, stderr}: {
        stdout: any;
        stderr: any;
    }): void;
    wait(...matchers: OutputMatcher[]): Promise<any>;
    alive(): Promise<any>;
}
export declare type Test = string | (string | [boolean, string])[] | RegExp | ((str: string) => boolean);
export declare function streamTest(stream: string, test: Test): (o: Output) => boolean;
export declare const stdout: (test: Test) => (o: Output) => boolean;
export declare const stderr: (test: Test) => (o: Output) => boolean;
export declare function execWebpack(args?: string[]): Exec;
export declare function execNode(command: string, args?: string[]): Exec;
export declare function exec(command: string, args?: string[]): Exec;
export declare function expectErrors(stats: any, count: number, errors?: string[]): void;
export declare function expectWarnings(stats: any, count: number, warnings?: string[]): void;
export declare function tsconfig(compilerOptions?: any, config?: any, fileName?: string): Fixture;
export declare function install(...name: string[]): Buffer;
export declare function json(obj: any): string;
export declare function checkOutput(fileName: string, fragment: string): void;
export declare function readOutput(fileName: string): string;
export declare function touchFile(fileName: string): Promise<any>;
export declare function compile(config: any): Promise<any>;
export interface TestEnv {
    TEST_DIR: string;
    OUT_DIR: string;
    SRC_DIR: string;
    LOADER: string;
    WEBPACK: string;
}
export declare function spec<T>(name: string, cb: (env: TestEnv, done?: () => void) => Promise<T>, disable?: boolean): void;
export declare function xspec<T>(name: string, cb: (env: TestEnv, done?: () => void) => Promise<T>): void;
export declare function watch(config: any, cb?: (err, stats) => void): Watch;
export declare class Watch {
    close: (callback: () => void) => void;
    private resolves;
    invoke(err: any, stats: any): void;
    wait(): Promise<any>;
}
export declare function pkg(): void;
export declare function src(fileName: string, text: string): Fixture;
export declare function file(fileName: string, text: string): Fixture;
export declare class Fixture {
    private text;
    private fileName;
    constructor(fileName: string, text: string);
    path(): string;
    toString(): string;
    touch(): void;
    update(updater: (text: string) => string): void;
    remove(): void;
}
