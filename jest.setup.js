import '@testing-library/jest-dom';
import { TransformStream } from 'web-streams-polyfill';
import 'whatwg-fetch';

if (typeof global.TransformStream === 'undefined') {
  global.TransformStream = TransformStream;
}