# Writing a problem

Problems are folders in the [ICPC problem package format, 2025-09](https://www.kattis.com/problem-package-format/spec/2025-09.html),
so standard problem-setting tools understand them. Keep them in a **private**
repository: `data/secret` is the hidden test data.

```
self-aware/                     folder name = URL slug, unless cgl.yaml sets one
  problem.yaml                  name, uuid, limits, keywords (tags)
  cgl.yaml                      difficulty: easy | medium | hard
  statement/problem.en.md       Markdown with $inline$ and $$display$$ math
  solution/solution.en.md       editorial (optional)
  data/sample/1.in, 1.ans       shown on the problem page, judged first
  data/secret/01.in, 01.ans     hidden tests, judged in file-name order
  data/secret/test_group.yaml   optional output_validator_args, see below
  submissions/accepted/…        reference solutions (not published)
```

[`fixtures/self-aware`](fixtures/self-aware) is a complete example.

## problem.yaml

```yaml
problem_format_version: "2025-09"
name: Self-Aware
uuid: 6f1d2c4e-8a3b-4f0e-9c1a-2b7d5e3f9a10   # generate once, never change
limits:
  time_limit: 1.0      # seconds, for C++; Python gets ×3, Java and JS ×2
  memory: 256          # MiB
keywords: [implementation]
```

The `uuid` is the problem's identity: renaming the folder or slug keeps its
history and submissions.

## Checking output

By default output is compared token by token, ignoring whitespace and letter
case. To change that, put the same `test_group.yaml` in `data/sample/` and
`data/secret/`:

```yaml
output_validator_args: [case_sensitive, space_change_sensitive, float_tolerance 1e-6]
```

`float_absolute_tolerance ε` and `float_relative_tolerance ε` are also
accepted.

## Rules

- At least one sample and one secret test. Samples stay under 16 KiB per file.
- Zero-pad test names (`01`, `02`, …, `10`): tests run in file-name order.
- Not supported yet: custom output validators, scoring or interactive
  problems, and images or LaTeX in statements. The importer rejects them
  rather than silently ignoring them.

## Publishing

```sh
pnpm --filter @cgl/api problems:import [--practice] path/to/problem...
```

Every publish that changes something creates a new immutable version.
Publishing an unchanged package does nothing. `--practice` lists the problem
in the practice set straight away. Without it, the problem stays hidden until
a contest that uses it ends.
