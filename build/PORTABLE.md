The installed electron-builder 24.13.3 NsisTarget.js emits a fixed UNPACK_DIR_NAME
when unpackDirName is a string OR falsy. This differs from its declaration comments.
Set portable.unpackDirName to true to omit that define, so portable.nsi retains
$PLUGINSDIR/app and each invocation owns its own temporary directory.

Do not change this based only on the option documentation. build:portable runs
test-portable-runtime.js against the actual executable. It requires renderer-loaded
reports from overlapping launches, checks runtime file hashes and independent
extraction folders, and verifies one launch exiting does not damage the other.
