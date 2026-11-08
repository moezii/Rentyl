import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Cleanup after each test
afterEach(() => {
    cleanup()
    localStorage.clear()
})

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn((key) => localStorageMock._store[key] || null),
    setItem: vi.fn((key, value) => { localStorageMock._store[key] = String(value) }),
    removeItem: vi.fn((key) => { delete localStorageMock._store[key] }),
    clear: vi.fn(() => { localStorageMock._store = {} }),
    _store: {}
}

global.localStorage = localStorageMock

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
    constructor() { }
    disconnect() { }
    observe() { }
    takeRecords() {
        return []
    }
    unobserve() { }
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    constructor() { }
    disconnect() { }
    observe() { }
    unobserve() { }
}

// Suppress console errors in tests (optional)
// vi.spyOn(console, 'error').mockImplementation(() => {})
