import { assertEquals } from "https://github.com/denoland/deno_std/raw/0.192.0/testing/asserts.ts"
import arrays from "./arrays.js"
import dataview from "./dataview.js"
import date from "./dates.js"
import errors from "./errors.js"
import objects from "./objects.js"
import strings from "./strings.js"
import typedarrays from "./typedarrays.js"

arrays(Deno.test, assertEquals)
dataview(Deno.test, assertEquals)
date(Deno.test, assertEquals)
errors(Deno.test, assertEquals)
objects(Deno.test, assertEquals)
strings(Deno.test, assertEquals)
typedarrays(Deno.test, assertEquals)
