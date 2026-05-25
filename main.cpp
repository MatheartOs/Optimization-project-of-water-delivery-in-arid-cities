#include <bits/stdc++.h>
using namespace std;

const int MAXN = 505;
bool vis[MAXN][MAXN];
int high[MAXN][MAXN];
int l[MAXN][MAXN], r[MAXN][MAXN];
int dx[] = {1, 0, -1, 0};
int dy[] = {0, 1, 0, -1};
const int INF = 1000006;

int n, m;

// 用于记录最终选中的蓄水厂坐标
vector<pair<int, int>> water_sources;
// 用于记录最后一行未通水的具体城市坐标
vector<pair<int, int>> uncover_cities;

void dfs(int x, int y) {
    vis[x][y] = 1;
    for (int i = 0; i < 4; i++) {
        int nx = x + dx[i];
        int ny = y + dy[i];
        if (nx < 1 || ny < 1 || nx > n || ny > m || high[nx][ny] >= high[x][y])
            continue;
        if (!vis[nx][ny])
            dfs(nx, ny);
        // DP状态转移：回溯更新左右边界
        l[x][y] = min(l[x][y], l[nx][ny]);
        r[x][y] = max(r[x][y], r[nx][ny]);
    }
}

int main() {

    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    cin >> n >> m;
    memset(l, INF, sizeof(l));
    water_sources.clear();
    uncover_cities.clear();

    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= m; j++) {
            cin >> high[i][j];
            // DP初始边界：最后一行节点自身就是边界
            if (i == n) {
                l[i][j] = j;
                r[i][j] = j;
            }
        }
    }

    for (int j = 1; j <= m; j++) {
        if (!vis[1][j]) {
            dfs(1, j);
        }
    }

    bool has_solution = true;
    for (int j = 1; j <= m; j++) {
        if (!vis[n][j]) {
            has_solution = false;
            uncover_cities.emplace_back(n, j);
        }
    }

    if (!has_solution) {
        cout << 0 << "\n";
        cout << "需要进行单独特殊供水的城市有：\n";
        cout << uncover_cities.size() << "\n";
        for (auto& p : uncover_cities) {
            cout << "(" << p.first << ", " << p.second << ")\n";
        }
        return 0;
    }

    int Left = 1;
    int ans = 0;
    while (Left <= m) {
        int Right = 0;
        int best_col = -1;
        for (int i = 1; i <= m; i++) {
            if (l[1][i] <= Left && r[1][i] > Right) {
                Right = r[1][i];
                best_col = i;
            }
        }

        water_sources.emplace_back(1, best_col);
        ans++;
        Left = Right + 1;
    }

    cout << 1 << "\n";
    cout << ans << "\n";
    cout << "蓄水厂具体坐标：\n";
    for (auto& p : water_sources) {
        cout << "(" << p.first << ", " << p.second << ")\n";
    }

    return 0;
}