#include <bits/stdc++.h>
#define REP(i, n) for (int i = 0; (i) < int(n); ++ (i))
#define REP3(i, m, n) for (int i = (m); (i) < int(n); ++ (i))
#define REP_R(i, n) for (int i = int(n) - 1; (i) >= 0; -- (i))
#define REP3R(i, m, n) for (int i = int(n) - 1; (i) >= int(m); -- (i))
#define ALL(x) begin(x), end(x)
#define dump(x) cerr << #x " = " << x << endl
#define unittest_name_helper(counter) unittest_ ## counter
#define unittest_name(counter) unittest_name_helper(counter)
#define unittest __attribute__((constructor)) void unittest_name(__COUNTER__) ()
using ll = long long;
using namespace std;
template <class T> using reversed_priority_queue = priority_queue<T, vector<T>, greater<T> >;
template <class T> inline void chmax(T & a, T const & b) { a = max(a, b); }
template <class T> inline void chmin(T & a, T const & b) { a = min(a, b); }
template <typename X, typename T> auto vectors(X x, T a) { return vector<T>(x, a); }
template <typename X, typename Y, typename Z, typename... Zs> auto vectors(X x, Y y, Z z, Zs... zs) { auto cont = vectors(y, z, zs...); return vector<decltype(cont)>(x, cont); }
template <typename T> ostream & operator << (ostream & out, vector<T> const & xs) { REP (i, int(xs.size()) - 1) out << xs[i] << ' '; if (not xs.empty()) out << xs.back(); return out; }

struct point_t { int x, y; };
inline bool operator == (point_t const & a, point_t const & b) { return a.x == b.x and a.y == b.y; }
inline double get_dist(point_t const & a, point_t const & b) { return hypot(b.x - a.x, b.y - a.y); }

double calculate_penalty(int dx, int dy, int k, int t) {
    return hypot(dx, dy) * (1 + k /(double) t);
}
double calculate_penalty(vector<tuple<int, int, vector<int> > > const & moves, int t) {
    double acc = 0;
    for (auto const & move : moves) {
        int dx = get<0>(move);
        int dy = get<1>(move);
        vector<int> const & ts = get<2>(move);
        acc += calculate_penalty(dx, dy, ts.size(), t);
    }
    return acc;
}

int get_nearest(point_t const & a, vector<point_t> const & bs) {
    int best_index = -1;
    double best_dist = INFINITY;
    REP (i, bs.size()) {
        double dist = get_dist(a, bs[i]);
        if (dist < best_dist) {
            best_dist = dist;
            best_index = i;
        }
    }
    return best_index;
}

vector<tuple<int, int, vector<int> > > solve(vector<point_t> taxis, vector<point_t> const & passengers, vector<point_t> const & zones) {
    vector<tuple<int, int, vector<int> > > result;
    for (point_t p : passengers) {
        int j = get_nearest(p, zones);
        auto it = find(ALL(taxis), zones[j]);
        int i = (it != taxis.end()) ?
            it - taxis.begin() :
            get_nearest(p, taxis);
        result.emplace_back(p.x - taxis[i].x, p.y - taxis[i].y, vector<int>(1, i));
        result.emplace_back(zones[j].x - p.x, zones[j].y - p.y, vector<int>(1, i));
        taxis[i] = zones[j];
    }
    return result;
}


int main() {
    // input
    int t; scanf("%d", &t);
    assert (t <= 20);
    vector<point_t> taxi(t);
    REP (i, t) {
        scanf("%d%d", &taxi[i].x, &taxi[i].y);
    }
    int p; scanf("%d", &p);
    assert (p <= 500);
    vector<point_t> passenger(p);
    REP (i, p) {
        scanf("%d%d", &passenger[i].x, &passenger[i].y);
    }
    int z; scanf("%d", &z);
    assert (z <= 20);
    vector<point_t> zone(z);
    REP (i, z) {
        scanf("%d%d", &zone[i].x, &zone[i].y);
    }

    // solve
    auto result = solve(taxi, passenger, zone);

    // output
    printf("%d\n", int(result.size()));
    for (auto const & move : result) {
        int dx = get<0>(move);
        int dy = get<1>(move);
        vector<int> const & ts = get<2>(move);
        int k = ts.size();
        printf("MOVE %d %d %d", dx, dy, k);
        for (int t_i : ts) {
            printf(" %d", t_i + 1);
        }
        printf("\n");
    }
    fprintf(stderr, "penalty: %lf\n", calculate_penalty(result, t));
    return 0;
}
