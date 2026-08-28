# Demo sandbox

## CLI

Run `restore-drill demo` after installation, or `cargo run -- demo` from this
repository. Add `--json` for machine-readable output. The command copies the
bundled `examples/demo-backup.tsv` into a newly named directory under the
system temporary directory. It restores that copy, runs row-count, schema, and
application checks, removes the disposable target, and prints the retained
attestation path. It never reads a configuration or data file from the current
directory.

Each run gets a separate temporary directory. Delete the printed sandbox path
when the evidence is no longer needed.

## Browser preview

Open <https://restore-drill-attestor.sociobot.in/?demo=1#demo> or choose
**Try it with sample data** on the first screen. Demo state stays in memory;
any browser storage uses only the `demo:` prefix. **Reset demo** clears that
namespace and reruns the passing sample. **Start for real** clears the demo
namespace and returns to the normal product page. The preview replays the same
four lifecycle stages and evidence shape as the bundled CLI demo; it does not
connect to a database.
