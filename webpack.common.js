const path = require("path");
const ejs = require('ejs');
const {version} = require('./package.json');

module.exports = {
  context: __dirname,
  entry: {
    'index': "./src/index.ts",
  },
  output: {
    path: path.join(__dirname, "dist"),
    filename: "[name].js"
  },
  module: {
    rules: []
  },
  mode: 'production',
  resolve: {
    extensions: [".js", ".ts"]
  }
};

function transformHtml(content) {
  return ejs.render(content.toString(), {
    ...process.env,
  });
}
