import { deepStrictEqual } from "node:assert"
import { test } from "node:test"
import arrays from "./arrays.js"
import dataview from "./dataview.js"
import date from "./dates.js"
import errors from "./errors.js"
import objects from "./objects.js"
import strings from "./strings.js"
import typedarrays from "./typedarrays.js"

arrays(test, deepStrictEqual)
dataview(test, deepStrictEqual)
date(test, deepStrictEqual)
errors(test, deepStrictEqual)
objects(test, deepStrictEqual)
strings(test, deepStrictEqual)
typedarrays(test, deepStrictEqual)
