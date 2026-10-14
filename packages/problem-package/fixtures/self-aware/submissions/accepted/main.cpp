#include <cstdio>
#include <cstdlib>

int main() {
    int n, k;
    std::scanf("%d %d", &n, &k);
    int count = 0;
    for (int i = 0; i < n; i++) {
        int g, r;
        std::scanf("%d %d", &g, &r);
        if (std::abs(g - r) <= k) count++;
    }
    std::printf("%d\n", count);
}
