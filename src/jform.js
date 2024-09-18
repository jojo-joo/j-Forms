(function ($) {
  var $ = function(selector) {
    return document.querySelector(selector);
  };

  const clone = (value) => {
    if (Array.isArray(value)) {
      return [...value];
    }
    return Object.assign({}, value);
  };
  
  /**
   * Returns true if given value is neither "undefined" nor null
   */
  var isSet = function (value) {
    return !(value === undefined || value === null);
  };

  /**
   * The jsonform object whose methods will be exposed to the window object
   */
  var jsonform = { util: {} };

  /**
   * Escapes selector name for use with jQuery
   *
   * All meta-characters listed in jQuery doc are escaped:
   * http://api.jquery.com/category/selectors/
   *
   * @function
   * @param {String} selector The jQuery selector to escape
   * @return {String} The escaped selector.
   */
  var escapeSelector = function (selector) {
    return selector.replace(/([ \!\"\#\$\%\&\'\(\)\*\+\,\.\/\:\;<\=\>\?\@\[\\\]\^\`\{\|\}\~])/g, '\\$1');
  };

  var inputFieldTemplate = function (type) {
    return {
      template: (node) => `<div class="pure-control-group"><label>${node.title}</label><input type="${type}" name="${node.key}" /></div>`,
    }
  };

  jsonform.elementTypes = {
    'none': {template: ''},
    'root': {template: (node) => `<div class="pure-form pure-form-aligned">${node.children_html}</div>`},
    'text': {template: (node) => `<div class="pure-control-group"><label>${node.title}</label></div>`},
    'input': inputFieldTemplate('text'),
    'password': inputFieldTemplate('password'),
    'email': inputFieldTemplate('email'),
    'number': inputFieldTemplate('number'),
    'tel': inputFieldTemplate('tel'),
    'url': inputFieldTemplate('url'),
    'date': inputFieldTemplate('date'),
    'time': inputFieldTemplate('time'),
    'range': {
      template : (node) => {
        return `<div class="pure-control-group"><label>${node.title}</label><input type="range" id="${node.key}" min="0" max="100" value="50">
        <div class="range-value" id="${node.key}-value">50</div></div>`;
      },
      onInput: (node) => {
        var rangeElement =  $("#" + node.key);
        var rangeValueElement = $("#" + node.key + "-value");
        rangeValueElement.textContent = rangeElement.value;
      },
    },
    'select': {
      template: (node) => {
        return `<div class="pure-control-group"><label>${node.title}</label><select name="${node.key}" id="${node.key}" >
        ${node.enum.map(val => {
          return node.value === val ? `<option selected value="${val}">${val}</option>` : `<option value="${val}">${val}</option>`;      
        }).join(' ')}</select></div>`;
      }
    },
    'checkbox': inputFieldTemplate('checkbox'),
    'file': {
      'template': '<input class="input-file" id="<%= id %>" name="<%= node.key %>" type="file" ' +
        '<%= (node.schemaElement && node.schemaElement.required ? " required=\'required\'" : "") %>' +
        '<%= (node.formElement && node.formElement.accept ? (" accept=\'" + node.formElement.accept + "\'") : "") %>' +
        '/>',
    },
    
    'submit': {template : (node) => `<div class="pure-control-group"><input type="submit" ${node.key ? `id="${node.key}"` : ''} class="button-success  pure-button" value="${node.key || node.title}" ${node.disabled ? 'disabled' : ''} /></div>`},
    'button': {template :(data) => `<button type="button" ${data.id ? `id="${data.id}"` : ''} class="button-secondary pure-button ${data.elt.htmlClass ? data.elt.htmlClass : ''}">${data.node.title}</button>`},
    'actions': {template : (data) => `<div class="${data.elt.htmlClass || ""}">${data.children}</div>`},
    'hidden': {
      'template': '<input type="hidden" id="<%= id %>" name="<%= node.key %>" value="<%= escape(value) %>" />'
    }
  };

  /**
   * Returns the initial value that a field identified by its key
   * should take.
   *
   * The "initial" value is defined as:
   * 1. the previously submitted value if already submitted
   * 2. the default value defined in the layout of the form
   * 3. the default value defined in the schema
   *
   * The "value" returned is intended for rendering purpose,
   * meaning that, for fields that define a titleMap property,
   * the function returns the label, and not the intrinsic value.
   *
   * The function handles values that contains template strings,
   * e.g. {{values.foo[].bar}} or {{idx}}.
   *
   * When the form is a string, the function truncates the resulting string
   * to meet a potential "maxLength" constraint defined in the schema, using
   * "..." to mark the truncation. Note it does not validate the resulting
   * string against other constraints (e.g. minLength, pattern) as it would
   * be hard to come up with an automated course of action to "fix" the value.
   *
   * @function
   * @param {Object} formObject The JSON Form object
   * @param {String} key The generic key path (e.g. foo[].bar.baz[])
   * @param {Array(Number)} arrayPath The array path that identifies
   *  the unique value in the submitted form (e.g. [1, 3])
   * @param {Object} tpldata Template data object
   * @param {Boolean} usePreviousValues true to use previously submitted values
   *  if defined.
   */
  var getInitialValue = function (formObject, key, arrayPath, tpldata, usePreviousValues) {
    var value = null;

    // Complete template data for template function
    tpldata = tpldata || {};
    tpldata.idx = tpldata.idx ||
      (arrayPath ? arrayPath[arrayPath.length - 1] : 1);
    tpldata.value = isSet(tpldata.value) ? tpldata.value : '';
    tpldata.getValue = tpldata.getValue || function (key) {
      return getInitialValue(formObject, key, arrayPath, tpldata, usePreviousValues);
    };

    // Helper function that returns the form element that explicitly
    // references the given key in the schema.
    var getFormElement = function (elements, key) {
      var formElement = null;
      if (!elements || !elements.length) return null;
      elements.forEach(elt=>{
        if (formElement) return;
        if (elt === key) {
          formElement = { key: elt };
          return;
        }
        if (typeof (elt) === 'string') return;
        if (elt.key === key) {
          formElement = elt;
        }
        else if (elt.items) {
          formElement = getFormElement(elt.items, key);
        }
      });
      return formElement;
    };
    var formElement = getFormElement(formObject.form || [], key);
    var schemaElement = getSchemaKey(formObject.schema, key);

    if (usePreviousValues && formObject.value) {
      // If values were previously submitted, use them directly if defined
      value = jsonform.util.getObjKey(formObject.value, applyArrayPath(key, arrayPath));
    }
    if (!isSet(value)) {
      if (formElement && (typeof formElement['value'] !== 'undefined')) {
        // Extract the definition of the form field associated with
        // the key as it may override the schema's default value
        // (note a "null" value overrides a schema default value as well)
        value = formElement['value'];
      }
      else if (schemaElement) {
        // Simply extract the default value from the schema
        if (isSet(schemaElement['default'])) {
          value = schemaElement['default'];
        }
      }
      if (value && value.indexOf('{{values.') !== -1) {
        // This label wants to use the value of another input field.
        // Convert that construct into {{getValue(key)}} for
        // Underscore to call the appropriate function of formData
        // when template gets called (note calling a function is not
        // exactly Mustache-friendly but is supported by Underscore).
        value = value.replace(
          /\{\{values\.([^\}]+)\}\}/g,
          '{{getValue("$1")}}');
      }
      // if (value) {
      //   value = tmpl(value, valueTemplateSettings)(tpldata);
      // }
    }

    // TODO: handle on the formElement.options, because user can setup it too.
    // Apply titleMap if needed
    // if (isSet(value) && formElement && hasOwnProperty(formElement.titleMap, value)) {
    //   value = tmpl(formElement.titleMap[value], valueTemplateSettings)(tpldata);
    // }

    // Check maximum length of a string
    if (value && typeof (value) === 'string' &&
      schemaElement && schemaElement.maxLength) {
      if (value.length > schemaElement.maxLength) {
        // Truncate value to maximum length, adding continuation dots
        value = value.substr(0, schemaElement.maxLength - 1) + '…';
      }
    }

    if (!isSet(value)) {
      return null;
    }
    else {
      return value;
    }
  };


  /**
   * Represents a node in the form.
   *
   * Nodes that have an ID are linked to the corresponding DOM element
   * when rendered
   *
   * Note the form element and the schema elements that gave birth to the
   * node may be shared among multiple nodes (in the case of arrays).
   *
   * @class
   */
  var formNode = function () {
    this.key = null; /* neccessary, for get input control value. */
    this.title = null; /* neccessary, as the label for input. */
    this.description = null; /* not neccessary, only display in stack mode */
    this.template = null; /* neccessary, DOM node template. */
    this.el = null; /* DOM element associated witht the formNode. */

    /**
     * Link to the form element that describes the node's layout
     * (note the form element is shared among nodes in arrays)
     */
    this.formElement = null;

    /**
     * Link to the schema element that describes the node's value constraints
     * (note the schema element is shared among nodes in arrays)
     */
    this.schemaElement = null;

    
    
    /**
     * Node's subtree (if one is defined)
     */
    this.children = [];

    /**
     * A pointer to the form tree the node is attached to
     */
    this.ownerTree = null;

    /**
     * A pointer to the parent node of the node in the tree
     */
    this.parentNode = null;

    /**
     * Child template for array-like nodes.
     *
     * The child template gets cloned to create new array items.
     */
    this.childTemplate = null;


    /**
     * Direct children of array-like containers may use the value of a
     * specific input field in their subtree as legend. The link to the
     * legend child is kept here and initialized in computeInitialValues
     * when a child sets "valueInLegend"
     */
    this.legendChild = null;


    /**
     * The path of indexes that lead to the current node when the
     * form element is not at the root array level.
     *
     * Note a form element may well be nested element and still be
     * at the root array level. That's typically the case for "fieldset"
     * elements. An array level only gets created when a form element
     * is of type "array" (or a derivated type such as "tabarray").
     *
     * The array path of a form element linked to the foo[2].bar.baz[3].toto
     * element in the submitted values is [2, 3] for instance.
     *
     * The array path is typically used to compute the right ID for input
     * fields. It is also used to update positions when an array item is
     * created, moved around or suppressed.
     *
     * @type {Array(Number)}
     */
    this.arrayPath = [];

    /**
     * Position of the node in the list of children of its parents
     */
    this.childPos = 0;
  };


  /**
   * Clones a node
   *
   * @function
   * @param {formNode} New parent node to attach the node to
   * @return {formNode} Cloned node
   */
  formNode.prototype.clone = function (parentNode) {
    var node = new formNode();
    node.arrayPath = clone(this.arrayPath);
    node.ownerTree = this.ownerTree;
    node.parentNode = parentNode || this.parentNode;
    node.formElement = this.formElement;
    node.schemaElement = this.schemaElement;
    node.view = this.view;
    node.children = this.children.map(child => {
      return child.clone(node);
    });
    if (this.childTemplate) {
      node.childTemplate = this.childTemplate.clone(node);
    }
    return node;
  };


  /**
   * Returns true if the subtree that starts at the current node
   * has some non empty value attached to it
   */
  formNode.prototype.hasNonDefaultValue = function () {

    // hidden elements don't count because they could make the wrong selectfieldset element active
    if (this.formElement && this.formElement.type == "hidden") {
      return false;
    }

    if (this.value && !this.defaultValue) {
      return true;
    }
    var child = this.children.find(child => {
      return child.hasNonDefaultValue();
    });
    return !!child;
  };

  formNode.prototype.appendChild = function (node) {
    node.parentNode = this;
    node.childPos = this.children.length;
    this.children.push(node);
    return node;
  };


  /**
   * Removes the last child of the node.
   *
   * @function
   */
  formNode.prototype.removeChild = function () {
    var child = this.children[this.children.length - 1];
    if (!child) return;

    // Remove the child from the DOM
    $(child.el).remove();

    // Remove the child from the array
    return this.children.pop();
  };


  /**
   * Moves the user entered values set in the current node's subtree to the
   * given node's subtree.
   *
   * The target node must follow the same structure as the current node
   * (typically, they should have been generated from the same node template)
   *
   * The current node MUST be rendered in the DOM.
   *
   * TODO: when current node is not in the DOM, extract values from formNode.value
   * properties, so that the function be available even when current node is not
   * in the DOM.
   *
   * Moving values around allows to insert/remove array items at arbitrary
   * positions.
   *
   * @function
   * @param {formNode} node Target node.
   */
  formNode.prototype.moveValuesTo = function (node) {
    var values = this.getFormValues(node.arrayPath);
    node.resetValues();
    node.computeInitialValues(values, true);
  };


  /**
   * Switches nodes user entered values.
   *
   * The target node must follow the same structure as the current node
   * (typically, they should have been generated from the same node template)
   *
   * Both nodes MUST be rendered in the DOM.
   *
   * TODO: update getFormValues to work even if node is not rendered, using
   * formNode's "value" property.
   *
   * @function
   * @param {formNode} node Target node
   */
  formNode.prototype.switchValuesWith = function (node) {
    var values = this.getFormValues(node.arrayPath);
    var nodeValues = node.getFormValues(this.arrayPath);
    node.resetValues();
    node.computeInitialValues(values, true);
    this.resetValues();
    this.computeInitialValues(nodeValues, true);
  };


  /**
   * Resets all DOM values in the node's subtree.
   *
   * This operation also drops all array item nodes.
   * Note values are not reset to their default values, they are rather removed!
   *
   * @function
   */
  formNode.prototype.resetValues = function () {
    var params = null;
    var idx = 0;

    // Reset value
    this.value = null;

    // Propagate the array path from the parent node
    // (adding the position of the child for nodes that are direct
    // children of array-like nodes)
    if (this.parentNode) {
      this.arrayPath = clone(this.parentNode.arrayPath);
      if (this.parentNode.view && this.parentNode.view.array) {
        this.arrayPath.push(this.childPos);
      }
    }
    else {
      this.arrayPath = [];
    }

    if (this.view) {
      // Simple input field, extract the value from the origin,
      // set the target value and reset the origin value
      params = $(':input', this.el).serializeArray();
      params.forEach(param => {
        // TODO: check this, there may exist corner cases with this approach
        // (with multiple checkboxes for instance)
        $('[name="' + escapeSelector(param.key) + '"]', $(this.el)).val('');
      }, this);
    }
    else if (this.view && this.view.array) {
      // The current node is an array, drop all children
      while (this.children.length > 0) {
        this.removeChild();
      }
    }

    // Recurse down the tree
    this.children.forEach(child => {
      child.resetValues();
    });
  };


  /**
   * Sets the child template node for the current node.
   *
   * The child template node is used to create additional children
   * in an array-like form element. The template is never rendered.
   *
   * @function
   * @param {formNode} node The child template node to set
   */
  formNode.prototype.setChildTemplate = function (node) {
    this.childTemplate = node;
    node.parentNode = this;
  };

  formNode.prototype.getFormValues = function (updateArrayPath) {
    // The values object that will be returned
    var values = {};

    if (!this.el) {
      throw new Error('formNode.getFormValues can only be called on nodes that are associated with a DOM element in the tree');
    }

    // Form fields values
    var formArray = $(':input', this.el).serializeArray();

    // Set values to false for unset checkboxes and radio buttons
    // because serializeArray() ignores them
    formArray = formArray.concat(
      $(':input[type=checkbox]:not(:disabled):not(:checked)', this.el).map(function () {
        return { "name": this.key, "value": this.checked }
      }).get()
    );

    if (updateArrayPath) {
      formArray.forEach(param => {
        param.key = applyArrayPath(param.key, updateArrayPath);
      });
    }

    // The underlying data schema
    var formSchema = this.ownerTree.formDesc.schema;

    for (var i = 0; i < formArray.length; i++) {
      // Retrieve the key definition from the data schema
      var name = formArray[i].key;
      var eltSchema = getSchemaKey(formSchema, name);
      var arrayMatch = null;
      var cval = null;

      // Skip the input field if it's not part of the schema
      if (!eltSchema) continue;

      // Handle multiple checkboxes separately as the idea is to generate
      // an array that contains the list of enumeration items that the user
      // selected.
      if (eltSchema._jsonform_checkboxes_as_array) {
        arrayMatch = name.match(/\[([0-9]*)\]$/);
        if (arrayMatch) {
          name = name.replace(/\[([0-9]*)\]$/, '');
          cval = jsonform.util.getObjKey(values, name) || [];
          if (formArray[i].value === '1') {
            // Value selected, push the corresponding enumeration item
            // to the data result
            cval.push(eltSchema['enum'][parseInt(arrayMatch[1], 10)]);
          }
          jsonform.util.setObjKey(values, name, cval);
          continue;
        }
      }

      // Type casting
      if (eltSchema.type === 'boolean') {
        if (formArray[i].value === '0') {
          formArray[i].value = false;
        } else {
          formArray[i].value = !!formArray[i].value;
        }
      }
      if ((eltSchema.type === 'number') ||
        (eltSchema.type === 'integer')) {
        if (typeof (formArray[i].value) === 'string') {
          if (!formArray[i].value.length) {
            formArray[i].value = null;
          } else if (!isNaN(Number(formArray[i].value))) {
            formArray[i].value = Number(formArray[i].value);
          }
        }
      }
      if ((eltSchema.type === 'string') &&
        (formArray[i].value === '') &&
        !eltSchema._jsonform_allowEmpty) {
        formArray[i].value = null;
      }
      if ((eltSchema.type === 'object') &&
        typeof (formArray[i].value) === 'string' &&
        (formArray[i].value.substring(0, 1) === '{')) {
        try {
          formArray[i].value = JSON.parse(formArray[i].value);
        } catch (e) {
          formArray[i].value = {};
        }
      }
      //TODO: is this due to a serialization bug?
      if ((eltSchema.type === 'object') &&
        (formArray[i].value === 'null' || formArray[i].value === '')) {
        formArray[i].value = null;
      }

      if (formArray[i].key && (formArray[i].value !== null)) {
        jsonform.util.setObjKey(values, formArray[i].key, formArray[i].value);
      }
    }
    return values;
  };

  formNode.prototype.render = function (el) {
    var html = this.generate(); // template to html
    el.innerHTML = html;
    this.enhance();
  };

  formNode.prototype.generate = function () {
    var template = this.view.template;
    var childrenhtml = '';
    this.children.forEach(child => {
      childrenhtml += child.generate();
    });
    this.children_html = childrenhtml;

    html = template(this);
    
    return html;
  };

  formNode.prototype.enhance = function () {
    if (this.view.onChange) 
      $("#"+this.key).addEventListener('change', () => { this.view.onChange(this); });
    if (this.view.onInput)  
      $("#"+this.key).addEventListener('input', ()=> { this.view.onInput(this); });
    if (this.view.onClick)  
      $("#"+this.key).addEventListener('click', ()=> { this.view.onClick(this); });
    if (this.view.onKeyUp)  
      $("#"+this.key).addEventListener('keyup', ()=> { this.view.onKeyUp(this); });
  
    this.children.forEach(child => {
      child.enhance();
    });
  };


  var formTree = function () {
    this.eventhandlers = [];
    this.root = null;
    this.formDesc = null;
  };

  formTree.prototype.createNode = function (key, schema) {
    var node = new formNode();

    node.key = key;
    node.title = schema.title || key;
    node.description = schema.description || "";
    node.enum = schema.enum || [];
    node.view = jsonform.elementTypes[schema['j-component']]; /* 'j-component' has been verified in caller. */

    return node;
  }

  formTree.prototype.traverseSchema = function (key, schema) {
    var node = null;

    if (schema['type'] && schema['j-component']) {
      node = this.createNode(key, schema);
    }
  
    if (schema.type == 'object' && schema.properties) {
      Object.keys(schema.properties).forEach(key => {
        node.appendChild(this.traverseSchema(key, schema.properties[key]));
      });
    }
    
    // after jsv, no need to do too much sanity check
    // if (schema.type == 'array') {
      if (schema.items) {
        node.appendChild(this.traverseSchema(key, schema.items));
      }
    // }

    return node;
  }
  /**
   * Initializes the form tree structure from the JSONForm object
   *
   * This function is the main entry point of the JSONForm library.
   *
   * Initialization steps:
   * 1. the internal tree structure that matches the JSONForm object
   *  gets created (call to buildTree)
   * 2. initial values are computed from previously submitted values
   *  or from the default values defined in the JSON schema.
   *
   * When the function returns, the tree is ready to be rendered through
   * a call to "render".
   *
   * @function
   */
  formTree.prototype.initialize = function (config) {
    formDesc = config || {};

    // Keep a pointer to the initial JSONForm
    // (note clone returns a shallow copy, only first-level is cloned)
    this.formDesc = clone(config);
    this.root = this.traverseSchema("root", this.formDesc.schema);
  };


  formTree.prototype.computeInitialValues = function () {
    this.root.computeInitialValues(this.formDesc.value);
  };

  formTree.prototype.render = function (el) {
    this.root.render(el);
  };

  formTree.prototype.forEachElement = function (callback) {

    var f = function (root) {
      for (var i = 0; i < root.children.length; i++) {
        callback(root.children[i]);
        f(root.children[i]);
      }
    };
    f(this.root);

  };

  formTree.prototype.validate = function (noErrorDisplay) {

    var values = jsonform.getFormValue(this.domRoot);
    var errors = false;

    var options = this.formDesc;

    if (options.validate !== false) {
      var validator = false;
      if (typeof options.validate != "object") {
        if (window.JSONFormValidator) {
          validator = window.JSONFormValidator.createEnvironment("json-schema-draft-03");
        }
      } else {
        validator = options.validate;
      }
      if (validator) {
        var v = validator.validate(values, this.formDesc.schema);
        $(this.domRoot).jsonFormErrors(false, options);
        if (v.errors.length) {
          if (!errors) errors = [];
          errors = errors.concat(v.errors);
        }
      }
    }

    if (errors && !noErrorDisplay) {
      if (options.displayErrors) {
        options.displayErrors(errors, this.domRoot);
      } else {
        $(this.domRoot).jsonFormErrors(errors, options);
      }
    }

    return { "errors": errors }

  }

  formTree.prototype.submit = function (evt) {

    var stopEvent = function () {
      if (evt) {
        evt.preventDefault();
        evt.stopPropagation();
      }
      return false;
    };
    var values = jsonform.getFormValue(this.domRoot);
    var options = this.formDesc;

    var brk = false;
    this.forEachElement(function (elt) {
      if (brk) return;
      if (elt.view.onSubmit) {
        brk = !elt.view.onSubmit(evt, elt); //may be called multiple times!!
      }
    });

    if (brk) return stopEvent();

    var validated = this.validate();

    if (options.onSubmit && !options.onSubmit(validated.errors, values)) {
      return stopEvent();
    }

    if (validated.errors) return stopEvent();

    if (options.onSubmitValid && !options.onSubmitValid(values)) {
      return stopEvent();
    }

    return false;

  };

  formTree.prototype.hasRequiredField = function () {
    var parseElement = function (element) {
      if (!element) return null;
      if (element.required && (element.type !== 'boolean')) {
        return element;
      }
      
      if (!element.properties) return null;
      var prop = Object.keys(element.properties).find(function (property) {
        return parseElement(property);
      });
      if (prop) {
        return prop;
      }

      if (element.items) {
        if (Array.isArray(element.items)) {
          prop = Object.keys(element.items).find(function (item) {
            return parseElement(item);
          });
        }
        else {
          prop = parseElement(element.items);
        }
        if (prop) {
          return prop;
        }
      }
    };

    return parseElement(this.formDesc.schema);
  };

  jsonform.getFormValue = function (formelt) {
    var form = $(formelt).data('jsonform-tree');
    if (!form) return null;
    return form.root.getFormValues();
  };


  var jsonForm = function (el, options) {
    options.submitEvent = 'submit';

    var form = new formTree();
    form.initialize(options);
    form.render(el);

    // Keep a direct pointer to the JSON schema for form submission purpose
    // p.data("jsonform-tree", form);

    // if (options.submitEvent) {
    //   p.unbind((options.submitEvent) + '.jsonform');
    //   p.bind((options.submitEvent) + '.jsonform', function (evt) {
    //     form.submit(evt);
    //   });
    // }

    return form;
  };

  window.jsonForm = jsonForm;

})(((typeof Zepto !== 'undefined') ? Zepto : { fn: {} }));
