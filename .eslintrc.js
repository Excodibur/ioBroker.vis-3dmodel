module.exports = {
    "ignorePatterns": ["*.min.js", "widgets/*/lib/*.js", "gulpfile.js"],
    "env": {
        "browser": true,
        "es2021": true,
        "jquery": true
    },
    "extends": [
        "standard"
    ],
    "parserOptions": {
        "ecmaVersion": 12
    },
    "rules": {
        "indent": ["warn", 4, { "SwitchCase": 1 }],
        "quotes": [
            "error",
            "double",
            {
                "avoidEscape": true,
                "allowTemplateLiterals": true
            }
        ],
        "quote-props": ["error", "always"],
        "semi": [
            "error",
            "always"
        ],
        "curly": ["warn", "multi-or-nest"],
        "space-before-function-paren": ["warn", "always"],
        "no-unused-vars": "warn"
    },
    "plugins": ["html"]
};
