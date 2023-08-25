import { deepStrictEqual } from "node:assert"
import { test } from "node:test"
import arrays from "./arrays.js"
import dataview from "./dataview.js"
import date from "./dates.js"
import errors from "./errors.js"
import maps from "./maps.js"
import numbers from "./numbers.js"
import objects from "./objects.js"
import regexps from "./regexs.js"
import sets from "./sets.js"
import strings from "./strings.js"
import typedarrays from "./typedarrays.js"
import references from "./references.js"
import extensionUrl from "./extension-url.js"
import extensionContext from "./extension-context.js"

arrays(test, deepStrictEqual)
dataview(test, deepStrictEqual)
date(test, deepStrictEqual)
errors(test, deepStrictEqual)
maps(test, deepStrictEqual)
numbers(test, deepStrictEqual)
objects(test, deepStrictEqual)
regexps(test, deepStrictEqual)
sets(test, deepStrictEqual)
strings(test, deepStrictEqual)
typedarrays(test, deepStrictEqual)
references(test, deepStrictEqual)
extensionUrl(test, deepStrictEqual)
extensionContext(test, deepStrictEqual)
