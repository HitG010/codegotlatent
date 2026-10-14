Before the show, each of the $N$ contestants guessed their final rank. Contestant $i$
guessed rank $g_i$ and finished at rank $r_i$.

A contestant is **self-aware** if their guess was off by at most $K$, that is
$|g_i - r_i| \le K$. How many contestants were self-aware?

## Input

The first line contains $N$ and $K$ ($1 \le N \le 2 \cdot 10^5$, $0 \le K \le N$).
Each of the next $N$ lines contains $g_i$ and $r_i$ ($1 \le g_i, r_i \le N$).

## Output

Print the number of self-aware contestants.
