module.exports = {
    "parserOptions": {
        "ecmaVersion": 6,
    },
    "env": {
        "node": true,
    },
    "extends": "eslint:recommended",
    "rules": {
       "indent": [1, 4],
       "global-require": 0,
       "camelcase": 0,
       "curly": 0,
       "no-undef": [2],
       "no-unused-vars": [1],
       "semi": [1, "always"],
    }
};