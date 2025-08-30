import {afterEach, beforeEach, describe, expect, jest, test} from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

import {Builder} from '@docker/actions-toolkit/lib/buildx/builder';
import {Buildx} from '@docker/actions-toolkit/lib/buildx/buildx';
import {Build} from '@docker/actions-toolkit/lib/buildx/build';
import {Context} from '@docker/actions-toolkit/lib/context';
import {Docker} from '@docker/actions-toolkit/lib/docker/docker';
import {GitHub} from '@docker/actions-toolkit/lib/github';
import {Toolkit} from '@docker/actions-toolkit/lib/toolkit';

import {BuilderInfo} from '@docker/actions-toolkit/lib/types/buildx/builder';
import {GitHubRepo} from '@docker/actions-toolkit/lib/types/github';

import * as context from '../src/context';

const tmpDir = path.join('/tmp', '.docker-build-push-jest');
const tmpName = path.join(tmpDir, '.tmpname-jest');

import repoFixture from './fixtures/github-repo.json';
jest.spyOn(GitHub.prototype, 'repoData').mockImplementation((): Promise<GitHubRepo> => {
  return <Promise<GitHubRepo>>(repoFixture as unknown);
});

jest.spyOn(Context, 'tmpDir').mockImplementation((): string => {
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, {recursive: true});
  }
  return tmpDir;
});

jest.spyOn(Context, 'tmpName').mockImplementation((): string => {
  return tmpName;
});

jest.spyOn(Docker, 'isAvailable').mockImplementation(async (): Promise<boolean> => {
  return true;
});

const metadataJson = path.join(tmpDir, 'metadata.json');
jest.spyOn(Build.prototype, 'getMetadataFilePath').mockImplementation((): string => {
  return metadataJson;
});

const imageIDFilePath = path.join(tmpDir, 'iidfile.txt');
jest.spyOn(Build.prototype, 'getImageIDFilePath').mockImplementation((): string => {
  return imageIDFilePath;
});

jest.spyOn(Builder.prototype, 'inspect').mockImplementation(async (): Promise<BuilderInfo> => {
  return {
    name: 'builder2',
    driver: 'docker-container',
    lastActivity: new Date('2023-01-16 09:45:23 +0000 UTC'),
    nodes: [
      {
        buildkit: 'v0.11.0',
        'buildkitd-flags': '--debug --allow-insecure-entitlement security.insecure --allow-insecure-entitlement network.host',
        'driver-opts': ['BUILDKIT_STEP_LOG_MAX_SIZE=10485760', 'BUILDKIT_STEP_LOG_MAX_SPEED=10485760', 'JAEGER_TRACE=localhost:6831', 'image=moby/buildkit:latest', 'network=host'],
        endpoint: 'unix:///var/run/docker.sock',
        name: 'builder20',
        platforms: 'linux/amd64,linux/amd64/v2,linux/amd64/v3,linux/arm64,linux/riscv64,linux/ppc64le,linux/s390x,linux/386,linux/mips64le,linux/mips64,linux/arm/v7,linux/arm/v6',
        status: 'running'
      }
    ]
  };
});

describe('getArgs', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    process.env = Object.keys(process.env).reduce((object, key) => {
      if (!key.startsWith('INPUT_')) {
        object[key] = process.env[key];
      }
      return object;
    }, {});
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  // prettier-ignore
  test.each([
    [
      0,
      '0.4.1',
      new Map<string, string>([
        ['context', '.'],
        ['load', 'false'],
        ['no-cache', 'false'],
        ['push', 'false'],
        ['pull', 'false'],
      ]),
      [
        'build',
        '--iidfile', imageIDFilePath,
        '.'
      ],
      undefined
    ],
    [
      1,
      '0.4.2',
      new Map<string, string>([
        ['build-args', `MY_ARG=val1,val2,val3
ARG=val
"MULTILINE=aaaa
bbbb
ccc"`],
        ['load', 'false'],
        ['no-cache', 'false'],
        ['push', 'false'],
        ['pull', 'false'],
      ]),
      [
        'build',
        '--build-arg', 'MY_ARG=val1,val2,val3',
        '--build-arg', 'ARG=val',
        '--build-arg', `MULTILINE=aaaa\nbbbb\nccc`,
        '--iidfile', imageIDFilePath,
        'https://github.com/docker/build-push-action.git#refs/heads/master'
      ],
      undefined
    ],
    [
      2,
      '0.4.2',
      new Map<string, string>([
        ['tags', 'name/app:7.4, name/app:latest'],
        ['load', 'false'],
        ['no-cache', 'false'],
        ['push', 'false'],
        ['pull', 'false'],
      ]),
      [
        'build',
        '--iidfile', imageIDFilePath,
        '--tag', 'name/app:7.4',
        '--tag', 'name/app:latest',
        'https://github.com/docker/build-push-action.git#refs/heads/master'
      ],
      undefined
    ],
    [
      3,
      '0.4.2',
      new Map<string, string>([
        ['context', '.'],
        ['labels', 'org.opencontainers.image.title=buildkit\norg.opencontainers.image.description=concurrent, cache-efficient, and Dockerfile-agnostic builder toolkit'],
        ['outputs', 'type=local,dest=./release-out'],
        ['load', 'false'],
        ['no-cache', 'false'],
        ['push', 'false'],
        ['pull', 'false'],
      ]),
      [
        'build',
        '--label', 'org.opencontainers.image.title=buildkit',
        '--label', 'org.opencontainers.image.description=concurrent, cache-efficient, and Dockerfile-agnostic builder toolkit',
        '--output', 'type=local,dest=./release-out',
        '.'
      ],
      undefined
    ],
    [
      4,
      '0.4.1',
      new Map<string, string>([
        ['context', '.'],
        ['platforms', 'linux/amd64,linux/arm64'],
        ['load', 'false'],
        ['no-cache', 'false'],
        ['push', 'false'],
        ['pull', 'false'],
      ]),
      [
        'build',
        '--platform', 'linux/amd64,linux/arm64',
        '.'
      ],
      undefined
    ],
    [
      5,
      '0.4.1',
      new Map<string, string>([
        ['context', '.'],
        ['load', 'false'],
        ['no-cache', 'false'],
        ['push', 'false'],
        ['pull', 'false'],
      ]),
      [
        'build',
        '--iidfile', imageIDFilePath,
        '.'
      ],
      undefined
    ],
    [
      6,
      '0.4.2',
      new Map<string, string>([
        ['context', '.'],
        ['secrets', 'GIT_AUTH_TOKEN=TEST_SECRET'],
        ['load', 'false'],
        ['no-cache', 'false'],
        ['push', 'false'],
        ['pull', 'false'],
      ]),
      [
        'build',
        '--iidfile', imageIDFilePath,
        '--secret', `id=GIT_AUTH_TOKEN,src=${tmpName}`,
        '.'
      ],
      undefined
    ],
    [
      7,
      '0.4.2',
      new Map<string, string>([
        ['github-token', 'DUMMY_TOKEN'],
        ['outputs', '.'],
        ['load', 'false'],
        ['no-cache', 'false'],
        ['push', 'false'],
        ['pull', 'false'],
      ]),
      [
        'build',
        '--output', '.',
        '--secret', `id=GIT_AUTH_TOKEN,src=${tmpName}`,
        'https://github.com/docker/build-push-action.git#refs/heads/master'
      ],
      undefined
    ],
    [
      8,
      '0.4.2',
      new Map<string, string>([
        ['context', 'https://github.com/docker/build-push-action.git#refs/heads/master'],
        ['tag', 'localhost:5000/name/app:latest'],
        ['platforms', 'linux/amd64,linux/arm64'],
        ['secrets', `GIT_AUTH_TOKEN=TEST_SECRET
"MYSECRET=aaaaaaaa
bbbbbbb
ccccccccc"
FOO=bar
"EMPTYLINE=aaaa

bbbb
ccc"`],
        ['file', './test/Dockerfile'],
        ['builder', 'builder-git-context-2'],
        ['load', 'false'],
        ['no-cache', 'false'],
        ['push', 'true'],
        ['pull', 'false'],
      ]),
      [
        'build',
        '--file', './test/Dockerfile',
        '--iidfile', imageIDFilePath,
        '--platform', 'linux/amd64,linux/arm64',
        '--secret', `id=GIT_AUTH_TOKEN,src=${tmpName}`,
        '--secret', `id=MYSECRET,src=${tmpName}`,
        '--secret', `id=FOO,src=${tmpName}`,
        '--secret', `id=EMPTYLINE,src=${tmpName}`,
        '--builder', 'builder-git-context-2',
        '--push',
        'https://github.com/docker/build-push-action.git#refs/heads/master'
      ],
      undefined
    ],
    [
      9,
      '0.4.2',
      new Map<string, string>([
        ['context', 'https://github.com/docker/build-push-action.git#refs/heads/master'],
        ['tag', 'localhost:5000/name/app:latest'],
        ['platforms', 'linux/amd64,linux/arm64'],
        ['secrets', `GIT_AUTH_TOKEN=TEST_SECRET
MYSECRET=aaaaaaaa
bbbbbbb
ccccccccc
FOO=bar
EMPTYLINE=aaaa

bbbb
ccc`],
        ['file', './test/Dockerfile'],
        ['builder', 'builder-git-context-2'],
        ['load', 'false'],
        ['no-cache', 'false'],
        ['push', 'true'],
        ['pull', 'false'],
      ]),
      [
        'build',
        '--file', './test/Dockerfile',
        '--iidfile', imageIDFilePath,
        '--platform', 'linux/amd64,linux/arm64',
        '--secret', `id=GIT_AUTH_TOKEN,src=${tmpName}`,
        '--secret', `id=MYSECRET,src=${tmpName}`,
        '--secret', `id=FOO,src=${tmpName}`,
        '--secret', `id=EMPTYLINE,src=${tmpName}`,
        '--builder', 'builder-git-context-2',
        '--push',
        'https://github.com/docker/build-push-action.git#refs/heads/master'
      ],
      undefined
    ],
    // ... remaining test cases unchanged ...
  ])(
    '[%d] given %p with %p as inputs, returns %p',
    async (num: number, buildxVersion: string, inputs: Map<string, string>, expected: Array<string>, envs: Map<string, string> | undefined) => {
      if (envs) {
        envs.forEach((value: string, name: string) => {
          process.env[name] = value;
        });
      }
      inputs.forEach((value: string, name: string) => {
        setInput(name, value);
      });
      const toolkit = new Toolkit();
      jest.spyOn(Buildx.prototype, 'version').mockImplementation(async (): Promise<string> => {
        return buildxVersion;
      });
      const inp = await context.getInputs();
      const res = await context.getArgs(inp, toolkit);
      expect(res).toEqual(['build', '--build-arg', 'FOO=bar', '--build-arg', 'BAZ=qux', '--iidfile', imageIDFilePathLocal, '--metadata-file', metadataJsonLocal, '.']);
    }
  );
});

// ... Additional tests with formatting fixes ...

test('should trim and normalize build-args with surrounding whitespace', async () => {
  setInput('context', '.');
  setInput('build-args', '   FOO=bar  ,   BAZ=qux  ');
  setInput('load', 'false');
  setInput('no-cache', 'false');
  setInput('push', 'false');
  setInput('pull', 'false');

  const tk = new Toolkit();
  const inp = await context.getInputs();
  const res = await context.getArgs(inp, tk);
  expect(res).toEqual(['build', '--build-arg', 'FOO=bar', '--build-arg', 'BAZ=qux', '--iidfile', imageIDFilePathLocal, '--metadata-file', metadataJsonLocal, '.']);
});

test('should support empty values in labels by skipping invalid entries gracefully', async () => {
  setInput('context', '.');
  setInput('labels', 'good=value\nbad=\n=alsobad\nanother=ok');
  setInput('outputs', 'type=local,dest=./release-out');
  setInput('load', 'false');
  setInput('no-cache', 'false');
  setInput('push', 'false');
  setInput('pull', 'false');

  const tk = new Toolkit();
  const inp = await context.getInputs();
  const res = await context.getArgs(inp, tk);
  expect(res).toEqual(['build', '--label', 'good=value', '--label', 'another=ok', '--output', 'type=local,dest=./release-out', '--metadata-file', metadataJsonLocal, '.']);
});

test('secrets with mixed delimiters (comma and newlines) produce multiple --secret flags', async () => {
  const tmpNamePath = path.join(tmpDirLocal, '.tmpname-extra');
  setInput('context', '.');
  setInput('secrets', `ONE=111, TWO=222\nTHREE=333`);
  setInput('load', 'false');
  setInput('no-cache', 'false');
  setInput('push', 'false');
  setInput('pull', 'false');

  const tk = new Toolkit();
  const inp = await context.getInputs();
  const res = await context.getArgs(inp, tk);
  expect(res).toEqual(['build', '--iidfile', imageIDFilePathLocal, '--secret', `id=ONE,src=${tmpNamePath}`, '--secret', `id=TWO,src=${tmpNamePath}`, '--secret', `id=THREE,src=${tmpNamePath}`, '--metadata-file', metadataJsonLocal, '.']);
});

test('secret-envs with spaces around delimiters are handled correctly', async () => {
  setInput('context', '.');
  setInput('secret-envs', ' ALPHA = A_ENV ,  BETA= B_ENV ');
  setInput('load', 'true');
  setInput('no-cache', 'false');
  setInput('push', 'false');
  setInput('pull', 'false');

  const tk = new Toolkit();
  const inp = await context.getInputs();
  const res = await context.getArgs(inp, tk);
  expect(res).toEqual(['build', '--secret', 'id=ALPHA,env=A_ENV', '--secret', 'id=BETA,env=B_ENV', '--iidfile', imageIDFilePathLocal, '--load', '--metadata-file', metadataJsonLocal, '.']);
});

test('outputs image type with multiple names parses quoted list correctly', async () => {
  setInput('context', '.');
  setInput('outputs', `type=image,"name=host:5000/a:1,host:5000/a:2",push-by-digest=true,push=true`);
  setInput('load', 'false');
  setInput('no-cache', 'false');
  setInput('push', 'false');
  setInput('pull', 'false');

  const tk = new Toolkit();
  const inp = await context.getInputs();
  const res = await context.getArgs(inp, tk);
  expect(res).toEqual(['build', '--iidfile', imageIDFilePathLocal, '--output', `type=image,"name=host:5000/a:1,host:5000/a:2",push-by-digest=true,push=true`, '--metadata-file', metadataJsonLocal, '.']);
});

test('ulimit accepts multiple lines and translates to multiple flags', async () => {
  setInput('context', '.');
  setInput('file', './test/Dockerfile');
  setInput('ulimit', 'nofile=1024:1024\nnproc=3\nmemlock=-1');
  setInput('load', 'false');
  setInput('no-cache', 'false');
  setInput('push', 'false');
  setInput('pull', 'false');

  const tk = new Toolkit();
  const inp = await context.getInputs();
  const res = await context.getArgs(inp, tk);
  expect(res).toEqual(['build', '--file', './test/Dockerfile', '--iidfile', imageIDFilePathLocal, '--ulimit', 'nofile=1024:1024', '--ulimit', 'nproc=3', '--ulimit', 'memlock=-1', '--metadata-file', metadataJsonLocal, '.']);
});

test('when BUILDX_NO_DEFAULT_ATTESTATIONS=1, attestation flags are not added', async () => {
  process.env['BUILDX_NO_DEFAULT_ATTESTATIONS'] = '1';

  setInput('context', '.');
  setInput('load', 'false');
  setInput('no-cache', 'false');
  setInput('push', 'false');
  setInput('pull', 'false');

  const tk = new Toolkit();
  const inp = await context.getInputs();
  const res = await context.getArgs(inp, tk);
  expect(res).toEqual(['build', '--iidfile', imageIDFilePathLocal, '--metadata-file', metadataJsonLocal, '.']);
});

function getInputName(name: string): string {
  return `INPUT_${name.replace(/ /g, '_').toUpperCase()}`;
}

function setInput(name: string, value: string): void {
  process.env[getInputName(name)] = value;
}

// ... the rest of the tests and helper functions remain unchanged ...