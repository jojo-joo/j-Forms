var schema = {
    "form" : {
        "USERNAME": { "type": "text"},
        "Password": { "type": "password" },
        'Birth Day': { "type": 'date' },
        'datetime': { "type": 'datetime' },
        'datetime-local': { "type": 'datetime-local' },
        'email': { "type": 'email' },
        'month': { "type": 'month' },
        'number': { "type": 'number' },
        'search': { "type": 'search' },
        'tel': { "type": 'tel' },
        'time': { "type": 'time' },
        'url': { "type": 'url' },
        'week': { "type": 'week' },
        "range": {"type": "range", "default": 4,"minimum": 0,"exclusiveMinimum": true,"maximum": 10},
        "this is checkbox": {"type": "checkbox"},
        "gender": {"type": "select","enum": ["male", "female", "alien"]},
        "submit": { "type": "submit"}
    }, 
    "command" : {
        'button1': { "type": 'button' , "title":'BUTTON1'},
        'button2': { "type": 'button' , "title":'BUTTON2'},
        'button3': { "type": 'button' , "title":'BUTTON3'},
        'button4': { "type": 'button' , "title":'BUTTON4'},
        'button5': { "type": 'button' , "title":'BUTTON5'}
    }
}
