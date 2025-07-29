/// <reference types="@testing-library/jest-dom" />

// Import Jest-DOM matchers to extend Vitest's `expect`
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with the Jest-DOM matchers
expect.extend(matchers);
