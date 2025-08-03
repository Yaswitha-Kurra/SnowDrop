const path = require('path');

  module.exports = {
    mode: 'production',
    entry: path.resolve(__dirname, 'node_modules/@solana/web3.js/dist/index.browser.esm.js'),
    output: {
      filename: 'solana-web3.js',
      path: path.resolve(__dirname, 'dist'),
      library: {
        type: 'umd',
        name: 'solanaWeb3',
      },
      globalObject: 'this',
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules\/(?!@solana)/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
            },
          },
        },
      ],
    },
    resolve: {
      fallback: {
        "crypto": false,
        "stream": false,
        "buffer": require.resolve('buffer/'),
      },
    },
    devtool: false,
  };