const React = require('react');

function Layout(props) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{props.title || 'Backend'}</title>
      </head>
      <body>
        <div id="root">{props.children}</div>
      </body>
    </html>
  );
}

module.exports = Layout;
