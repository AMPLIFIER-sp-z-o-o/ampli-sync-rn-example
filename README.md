# AMPLI-SYNC React Native Example

Example React Native client for [AMPLI-SYNC](https://github.com/AMPLIFIER-sp-z-o-o/ampli-sync).

This application demonstrates how a mobile client can use a local SQLite database and synchronize changes with the AMPLI-SYNC backend. 

The application code is intended to be portable between Android and iOS. The local setup described below uses the Android emulator.

## Features

The example client can:

- download a prepopulated SQLite database from the backend,
- work with the downloaded database locally on the device,
- create, update and delete demo customer records,
- push local changes to the backend,
- pull changes from the backend.

## Requirements

For the tested local Android setup:

- local AMPLI-SYNC backend running from [AMPLI-SYNC](https://github.com/AMPLIFIER-sp-z-o-o/ampli-sync)
- Node.js 20+
- npm
- Android emulator
- Android SDK platform-tools (`adb`)

## Running the app

### Backend

Start the local backend from the [AMPLI-SYNC](https://github.com/AMPLIFIER-sp-z-o-o/ampli-sync) repository.

For the tested Android emulator setup, this app is configured in `environment.ts` to use:

```text
  http://10.0.2.2:8080/ampli-sync/
```
`10.0.2.2` is the Android emulator address for the host machine.

If you run the app on a physical device or use a different backend host, update `environment.ts`.

### Install dependencies

```sh
npm install
```

### Run locally on Android emulator

Start an Android emulator.

In the first terminal, start Metro:

```sh
npm start
```
In the second terminal, make sure `adb` is available. For example:

```sh
export PATH="$HOME/Android/Sdk/platform-tools:$PATH"
adb devices
```
The emulator should be listed as a connected device.

Then run the app:

```sh
adb reverse tcp:8081 tcp:8081
npm run android
```
### Local login

In the demo setup, credentials are not validated.
Any login and password can be used. 
## Demo flow

After logging in:

1. Click `Add demo customer` to insert a customer into local SQLite.
2. Click `Update demo customer` to update the last local demo customer.
3. Click `Delete demo customer` to delete the last local demo customer.
4. Click `Sent data to server` to push local SQLite changes to the backend.
5. Click `Get changes from server` to pull changes from the backend.

To verify that pushed data reached PostgreSQL, run:

```sql
select id, name, email, city, created_at, rowid
from tenant_test.demo_customers
where email like 'customer-from-app-%'
```
## iOS

The current local demo instructions focus on the Android emulator setup. For iOS, the backend URL may need to be adjusted.

## Troubleshooting

### `adb: not found`

Add Android platform-tools to your `PATH`:

```sh
export PATH="$HOME/Android/Sdk/platform-tools:$PATH"
```

### If the app starts, but cannot connect to the React server, run:

 ```sh
  adb reverse tcp:8081 tcp:8081
```
  This forwards port 8081 from the Android emulator to the host machine, where Metro is running.


