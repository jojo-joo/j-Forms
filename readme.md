# json based webui generator for MCU

## Features
### Easy to use
- one json schema, build the whole web portal including frontend & backend & protocol.
- only one include file which is required for C language.
- no need to understand css/js/html/restufl/http too much.
### Modern web technology
- [pure-css](https://github.com/pure-css/pure/) A set of small, responsive CSS modules that you can use in every web project.
- [jsonform](https://github.com/jsonform/jsonform) The JSON Form library is a JavaScript client-side library that takes a structured data model defined using JSON Schema as input and returns a Bootstrap 3-friendly HTML form that matches the schema.
- [zepto](https://zeptojs.com/) Zepto is a minimalist JavaScript library for modern browsers with a largely jQuery-compatible API. If you use jQuery, you already know how to use Zepto.
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

##  log
orginal version, 3,284,244 bytes
replace jquery to zepto, remove unessesary files, 596,501 bytes