import React, {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createAsset } from "use-asset";
import { hot } from "react-hot-loader/root";
import {
  BehaviorSubject,
  Subject,
  from,
  interval,
  lastValueFrom,
  firstValueFrom,
} from "rxjs";
import {
  combineLatestWith,
  delay,
  first,
  last,
  mergeMap,
  take,
  takeLast,
} from "rxjs/operators";
import styles from "./App.module.scss";

// https://github.com/noderaider/jwt-autorefresh

const token$ = new BehaviorSubject(null);

console.log({ token$ });

// Create a cached source
// const asset = createAsset(async (id, token) => {
//   // Any async task can run in here, fetch requests, parsing, workers, promises, ...
//   const res = await fetch(`user?id=${id}&token=${token}`);
//   return await res.json();
// });

const asset = createAsset(async (id, token, user$) => {
  const user = await firstValueFrom(
    user$.pipe(delay(500), combineLatestWith(token$), delay(500))
  );
  console.log({ user });

  const res = await fetch(`api/user?id=${id}&token=${token}`);
  return await res.json();
});

function User({ id, token }) {
  const [counter, setCounter] = useState(() => 0);
  const handleIncrement = useCallback(
    () => setCounter((counter) => counter + 1),
    []
  );

  const user$ = useMemo(() => new BehaviorSubject(1), []);
  useEffect(() => {
    const subscription = user$.subscribe((user) => console.log({ user }));
    return () => subscription.unsubscribe();
  }, [user$]);

  const [, setState] = useState();
  // Then read from it ...
  const user = asset.read(id, token, user$); // As many cache keys as you need

  const handleRefresh = useCallback(
    () => (asset.clear(), setState(null)),
    [asset]
  );

  // By the time we're here the async data has resolved
  return (
    <div>
      <pre>{JSON.stringify(user, null, 2)}</pre>
      <button onClick={handleRefresh}>handleRefresh</button>
      <button onClick={handleIncrement}>handleIncrement {counter}</button>
    </div>
  );
}

const Spinner = () => <span>Loading...</span>;

function App() {
  const [token, setToken] = useState(() => token$.value);
  useEffect(() => {
    const subscription = token$.subscribe(
      (token) => Boolean(console.log({ token })) || setToken(token)
    );
    return () => subscription.unsubscribe();
  }, [token$]);

  const [counter, setCounter] = useState(() => 0);
  const handleIncrement = useCallback(
    () => setCounter((counter) => counter + 1),
    []
  );

  // const token$ = useMemo(() => new Subject(), [])
  // const [token, setToken] = useState(() => token$.value)
  // // const [login$] = useState(() => new Subject())
  // useEffect(() => {
  //   // console.log(['useeffect'])
  //   const subscription = token$.pipe(
  //     // mergeMap(() => from(fetch('auth').then(res => res.json())))
  //   ).subscribe((token$) => console.log({token$})||setToken(token$.token))
  //   return () => subscription.unsubscribe();
  // }, [token$])

  // console.log({token})

  const signin$ = useMemo(() => new Subject(), []);
  useEffect(() => {
    const subscription = signin$
      .pipe(
        delay(500),
        mergeMap(() =>
          from(fetch("api/auth/signin").then((res) => res.json()))
        ),
        delay(500)
      )
      .subscribe(
        (signin) => Boolean(console.log({ signin })) || token$.next(signin)
      );
    return () => subscription.unsubscribe();
  }, [signin$]);
  const handleSignin = useCallback(() => signin$.next(1), [signin$]);

  const verify$ = useMemo(() => new Subject(), []);
  useEffect(() => {
    const subscription = verify$
      .pipe(
        delay(500),
        mergeMap(() =>
          from(fetch("api/auth/verify").then((res) => res.json()))
        ),
        delay(500)
      )
      .subscribe((verify) => Boolean(console.log({ verify })));
    return () => subscription.unsubscribe();
  }, [verify$]);
  const handleVerify = useCallback(() => verify$.next(1), [verify$]);

  const refresh$ = useMemo(() => new Subject(), []);
  useEffect(() => {
    const subscription = refresh$
      .pipe(
        delay(500),
        mergeMap(() =>
          from(fetch("api/auth/refresh-token").then((res) => res.json()))
        ),
        delay(500)
      )
      .subscribe(
        (refresh) => Boolean(console.log({ refresh })) || token$.next(refresh)
      );
    return () => subscription.unsubscribe();
  }, [refresh$]);
  const handleRefresh = useCallback(() => refresh$.next(1), [refresh$]);

  const logout$ = useMemo(() => new Subject(), []);
  useEffect(() => {
    const subscription = logout$
      .pipe(
        delay(500),
        mergeMap(() =>
          from(fetch("api/auth/logout").then((res) => res.json()))
        ),
        delay(500)
      )
      .subscribe(
        (logout) => Boolean(console.log({ logout })) || token$.next(logout)
      );
    return () => subscription.unsubscribe();
  }, [logout$]);
  const handleLogout = useCallback(() => logout$.next(1), [logout$]);

  // const handleLogin = useCallback(async () => {
  //   const id = 1;
  //   const res = await fetch(`jwt/login/${id}`);
  //   await res.json().then(({ token }) => setToken(token));
  // }, []);
  // const handleLogout = useCallback(() => {
  //   setUser(undefined);
  //   setToken(undefined);
  // }, []);
  // const handleProfile = useCallback(async () => {
  //   const res = await fetch(`jwt/profile`, {
  //     headers: token
  //       ? {
  //           authorization: `Bearer ${token}`,
  //         }
  //       : {},
  //   });
  //   return await res.json().then(setUser);
  // }, [token]);

  return (
    <section className={styles.App}>
      <h1 className={styles.Nav}>jwt</h1>
      <pre>{JSON.stringify(token, null, 2)}</pre>
      <button onClick={handleSignin}>handleSignin</button>
      <button onClick={handleVerify}>handleVerify</button>
      <button onClick={handleRefresh}>handleRefresh</button>
      <button onClick={handleLogout}>handleLogout</button>
      <button onClick={handleIncrement}>handleIncrement {counter}</button>
      <Suspense fallback={<Spinner />}>
        <User id="1" token={token} />
      </Suspense>
    </section>
  );
}

export default hot(App);
