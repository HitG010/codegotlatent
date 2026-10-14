import sys

data = sys.stdin.buffer.read().split()
n, k = int(data[0]), int(data[1])
a = list(map(int, data[2:2 + n]))
window = sum(a[:k])
best = window
for i in range(k, n):
    window += a[i] - a[i - k]
    best = max(best, window)
print(best)
