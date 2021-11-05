import React, { Suspense } from "react";
import { createAsset } from "use-asset";
import { hot } from "react-hot-loader/root";
import styles from "./App.module.scss";

// Create a cached source
const asset = createAsset(async (id) => {
  // Any async task can run in here, fetch requests, parsing, workers, promises, ...
  const res = await fetch(`user?id=${id}`);
  return await res.json();
});

function User({ id }) {
  // Then read from it ...
  const user = asset.read(id); // As many cache keys as you need
  // By the time we're here the async data has resolved
  return <pre>{JSON.stringify(user, null, 2)}</pre>;
}

const Spinner = () => <span>Loading...</span>;

function App() {
  return (
    <section className={styles.App}>
      <h1 className={styles.Nav}>jwt</h1>
      <Suspense fallback={<Spinner />}>
        <User id="1" />
      </Suspense>
    </section>
  );
}

export default hot(App);
