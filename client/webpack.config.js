const path = require("path");
const webpack = require("webpack");
const HtmlWebPackPlugin = require("html-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");

module.exports = (env) => {
  const PRODUCTION = !!(env && env.BUILD_PRODUCTION);
  process.env.NODE_ENV = PRODUCTION ? "production" : "development";

  const definePlugin = new webpack.DefinePlugin({
    __PRODUCTION__: JSON.stringify(
      JSON.parse(env ? env.BUILD_PRODUCTION || "false" : "false")
    ),
  });

  return {
    target: "web",
    mode: PRODUCTION ? "production" : "development",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "bundle.min.js",
      publicPath: "/",
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          include: [path.resolve(__dirname, "src")],
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
          },
        },
        {
          test: /\.html$/,
          use: [
            {
              loader: "html-loader",
              options: { esModule: false },
            },
          ],
        },
        {
          test: /\.css$/,
          use: [
            "style-loader",
            {
              loader: "css-loader",
              options: {
                sourceMap: !PRODUCTION,
                modules: {
                  mode: "local",
                  exportLocalsConvention: "camelCase",
                  localIdentName: "[path][name]__[local]--[hash:base64:5]",
                },
              },
            },
            { loader: "postcss-loader", options: { sourceMap: !PRODUCTION } },
          ],
        },
        {
          test: /\.(png|svg|jpg|gif)$/,
          type: "asset",
          parser: {
            dataUrlCondition: {
              maxSize: 8192,
            },
          },
          generator: {
            filename: PRODUCTION
              ? "[contenthash][ext]"
              : "[path][name][ext]?[contenthash]",
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: "asset/resource",
          generator: {
            filename: PRODUCTION
              ? "[contenthash][ext]"
              : "[path][name][ext]?[contenthash]",
          },
        },
      ],
    },
    resolve: {
      extensions: [".js", ".scss"],
      alias: {
        ["~"]: path.resolve(__dirname, "src"),
      },
    },
    plugins: [
      new HtmlWebPackPlugin({
        template: "./src/index.html",
        filename: "./index.html",
        inject: true,
      }),
      definePlugin,
      new ESLintPlugin({
        extensions: ["js", "jsx"],
        context: path.resolve(__dirname, "src"),
        exclude: ["node_modules"],
      }),
    ],
    watchOptions: {
      ignored: /node_modules/,
    },
  };
};
