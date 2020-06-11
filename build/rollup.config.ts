import { join } from 'path';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import json from '@rollup/plugin-json';
import typescript from 'rollup-plugin-typescript';
import license from 'rollup-plugin-license';

export default {
  input: join(__dirname, '../src/index.ts'),
  output: [
    {
      format: 'cjs',
      file: join(__dirname, '../dist/easy-commit.js')
    }
  ],
  plugins: [
    resolve(),
    commonjs(),
    json(),
    typescript(),
    license({
      banner: {
        commentStyle: 'none',
        content: '#!/usr/bin/env node'
      }
    })
  ]
};
