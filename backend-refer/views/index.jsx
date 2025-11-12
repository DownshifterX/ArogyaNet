const React = require('react');
const Layout = require('./layout');

function Index(props) {
  return (
    <Layout title={props.title}>
      <h1>{props.heading}</h1>
      <p>{props.message}</p>
      <p>Routes available:</p>
      <ul>
        <li>/api/auth</li>
        <li>/api/users</li>
        <li>/api/appointments</li>
        <li>/api/video</li>
      </ul>
    </Layout>
  );
}

module.exports = Index;
