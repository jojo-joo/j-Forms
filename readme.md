# json based webui generator for MCU

## Features
### Easy to use
- one json schema, build the whole web portal including frontend & backend & protocol.
- only one include file which is required for C language.
- no need to understand css/js/html/restufl/http too much.
### Modern web technology
- [pure-css](https://github.com/pure-css/pure/) A set of small, responsive CSS modules that you can use in every web project.
- [jsonform](https://github.com/jsonform/jsonform) The JSON Form library is a JavaScript client-side library that takes a structured data model defined using JSON Schema as input and returns a Bootstrap 3-friendly HTML form that matches the schema.
- [zepto](https://github.com/madrobby/zepto) Zepto is a minimalist JavaScript library for modern browsers with a largely jQuery-compatible API. If you use jQuery, you already know how to use Zepto.
- [jsonforms](https://github.com/eclipse[source/jsonforms) Customizable JSON Schema-based forms with React, Angular and Vue support out of the box.
- [formily](https://github.com/alibaba/formily) Cross Device & High Performance Normal Form/Dynamic(JSON Schema) Form/Form Builder -- Support React/React Native/Vue 2/Vue 3

### Performance
- the whole footprint (including css/html/javascript/schema/server) size is should not greater than 100kB which is suitable for most modern mcu flash size.
- all the web files are packed into one single html file to improve the network performance
- split validation works into client side and server side. heavy and view related works on client side, server side only do sanity check.

## Goals

In embedded development, web development typically exhibits the following characteristics:

- **Simplicity:** Pages are generally quite simple, focusing mainly on form submissions. Responsable UI is not required, little controls 
- **Resource Constraints:** Resources are extremely limited, including memory and processing power.
- **Low Aesthetic Requirements:** Pages need to be neat and concise, with minimal focus on aesthetics.
- **Comprehensive Responsibility:** Due to the unique nature of the hardware, the front-end, communication protocols, and back-end processing are usually handled by embedded engineers, resulting in a substantial workload.

To provide embedded engineers with a solution that is tidy, fast, simple, and robust, a framework called j-form has been developed to achieve the following objectives:

1. **Unified Style Form Controls:** Over 50 form controls with a unified style.
2. **Lightweight Framework:** A framework size of less than 100KB, utilizing front-end browser resources for validation.
3. **Builtin Style Support:** Support for VUE, MATERIAL, and BOOTSTRAP styles.
4. **Automatic Code Generation:** Definition of data formats, with automatic generation of front-end, protocol, and back-end code.

## Roadmap
- 0.1.00 can simple work, according to a json schema, generate css/html/js/c into a single c header file, which can run on esp32 esp-idf.
- 0.2.00 can runs on esp32 arduino.
- 0.3.00 can runs on stm32.
- 0.4.00 support materia style.
- 0.5.00 support bootstrap style.
- 0.6.00 support client side verify.
- 0.7.00 support server side verify.
- 0.8.00 support json schema sanity check.
- 0.9.00 fix issues, full test, full ci, prepare for 1.0.00 release.

## Restriction
- consider the key length in embeded system is no greater than 16 generally, jform set the maximun key size to  16
- to simplify the json syntax,  Represent different forms using JSON array. for each key/value pair in json, if the value is an object, it is a control, if the value is an array, it is a tab.


##  log
derived from jsonform, replaced underscore to es6;
orginal version, 3,284,244 bytes
replace jquery to zepto, remove unessesary files, 596,501 bytes
remove jsonform-split, jsonform-defaults, jsv.js, 363,576 bytes
jsonform-2.2.5.04: 156,349 bytes
- replace underscore to es6. 
- ace removed. 
- wysihtml5 removed
- file-hosted-public removed
- file-transloadit removed
- imageselect removed
- iconselect removed
