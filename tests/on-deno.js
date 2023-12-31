import { assertEquals } from "https://github.com/denoland/deno_std/raw/0.192.0/testing/asserts.ts"
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

arrays(Deno.test, assertEquals)
dataview(Deno.test, assertEquals)
date(Deno.test, assertEquals)
errors(Deno.test, assertEquals)
maps(Deno.test, assertEquals)
numbers(Deno.test, assertEquals)
objects(Deno.test, assertEquals)
regexps(Deno.test, assertEquals)
sets(Deno.test, assertEquals)
strings(Deno.test, assertEquals)
typedarrays(Deno.test, assertEquals)
references(Deno.test, assertEquals)
extensionUrl(Deno.test, assertEquals)
extensionContext(Deno.test, assertEquals)
