import sys

data = sys.stdin.buffer.read().split()
n, k = int(data[0]), int(data[1])
pairs = data[2:]
print(sum(abs(int(pairs[2 * i]) - int(pairs[2 * i + 1])) <= k for i in range(n)))
