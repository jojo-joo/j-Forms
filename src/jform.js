(function () {
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
{/* <form class="tab-content" id="Info">Content for Tab 2</form> */}
  jsonform.elementTypes = {
    'none': {template: ''},
    'page': {template: (node) => `<form class="pure-form pure-form-aligned">${node.children_html}</form>`},
    'tab': {template: (node) => `<form class="pure-form pure-form-aligned tab-content ${node.form_index==0?"active":""}" id="${node.key}">${node.children_html}</form>`},
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

  formNode.prototype.appendChild = function (node) {
    node.parentNode = this;
    node.childPos = this.children.length;
    this.children.push(node);
    return node;
  };

  formNode.prototype.render = function (el) {
    var html = this.generate(); // template to html
    el.innerHTML += html;
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
  formTree.prototype.initialize = function (key, form_index, schema) {
    formDesc = schema || {};

    // Keep a pointer to the initial JSONForm
    // (note clone returns a shallow copy, only first-level is cloned)
    this.formDesc = clone(schema);
    this.root = this.traverseSchema(key, this.formDesc);
    this.root.form_index = form_index;
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

  var jsonForm = function (el, key, form_index, schema, config) {
    // options.submitEvent = 'submit';

    var form = new formTree();
    form.initialize(key, form_index, schema);
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

/**
 * one app contains only one jForms which may contains multiple jForm, which
 * is generated by $.fn.jsonForm(). to simplify the whole jForms logic.
 * We only use two layers of JSON structure. The first layer is for 'form', 
 * where each application has at least one or multiple forms, 
 * and each form corresponds to a tab. 
 * The second layer represents the controls contained within each form.
 */
  var jsonForms = function (el, schema, config) {
    /* only one tab, do not display any tabs */
    if (schema["j-component"] == "page") {
      jsonForm(el, "root", 0, schema, config);
    } else if (schema["j-component"] == "tabs") {
      html = `<div class="tabs">`;
      Object.keys(schema.properties).forEach((key, index)=>{
        html += `<div class="tab ${index==0?"active":""}" onclick="showTabContent(this)"><B>${key}</B></div>`;
      });
      html += `</div>`;
      el.innerHTML = html;
      Object.keys(schema.properties).forEach((key, index)=>{
        jsonForm(el, key, index, schema.properties[key], config);
      });
    } else {
      throw new Error('jsonForms schema root component must be page or tabs');
    }
  };
  
  window.jsonForms = jsonForms;
})();

// ui related script here
function showTabContent(el) {
  var tabs = document.querySelectorAll('.tab');
  var tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.classList.remove('active');
  });
  
  tabContents.forEach(content => {
    content.classList.remove('active');
  });

  // Set the active tab and content
  el.classList.add('active');
  document.querySelector("#"+el.innerText).classList.add('active');
}
