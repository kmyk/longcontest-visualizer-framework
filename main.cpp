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
inline point_t operator - (point_t const & a, point_t const & b) { return (point_t) { a.x - b.x, a.y - b.y }; }
inline double get_dist(point_t const & a, point_t const & b) { return hypot(b.x - a.x, b.y - a.y); }
struct point_hash {
    uint64_t operator () (point_t const & a) const {
        return hash<uint64_t>()(((uint64_t)a.x << 32) | a.y);
    }
};

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

template <typename T>
bool is_unique(vector<T> const & a) {
    REP (i, a.size()) {
        if (find(a.begin() + (i + 1), a.end(), a[i]) != a.end()) {
            return false;
        }
    }
    return true;
}

vector<tuple<int, int, vector<int> > > solve(vector<point_t> taxi, vector<point_t> const & passenger, vector<point_t> const & zone) {
    const int t = taxi.size();
    const int p = passenger.size();
    const int z = zone.size();
    default_random_engine gen;
    vector<tuple<int, int, vector<int> > > result;
    vector<bool> carrying(taxi.size());
    vector<bool> delivered(passenger.size());
    int count_carrying = 0;
    int count_delivered = 0;
    typedef unordered_multimap<point_t, pair<int, int>, point_hash> map_t;
    map_t delta;
    while (count_delivered < p or count_carrying) {
        delta.clear();
        REP (j, p) if (not delivered[j]) {
            REP (i, t) if (not carrying[i]) {
                point_t d = passenger[j] - taxi[i];
                delta.emplace(d, make_pair(i, j));
            }
        }
        REP (j, z) {
            REP (i, t) if (carrying[i]) {
                point_t d = zone[j] - taxi[i];
                delta.emplace(d, make_pair(i, j));
            }
        }
        vector<pair<int, map_t::const_iterator> > freq;
        for (auto l = delta.begin(); l != delta.end(); ) {
            auto r = next(l);
            while (r != delta.end() and l->first == r->first) ++ r;
            freq.emplace_back(distance(l, r), l);
            l = r;
        }
        int k; map_t::const_iterator it;
        tie(k, it) = *max_element(ALL(freq), [&](pair<int, map_t::const_iterator> const & a, pair<int, map_t::const_iterator> const & b) {
            return a.first > b.first;
        });
        int dx, dy;
        vector<int> ts;
        vector<bool> used(t);
        unordered_set<point_t, point_hash> used_position;
        REP (iteration, k) {
            int i, j; tie(i, j) = it->second;
            if (iteration == 0) {
                point_t next_taxi = not carrying[i] ? passenger[j] : zone[j];
                dx = next_taxi.x - taxi[i].x;
                dy = next_taxi.y - taxi[i].y;
            }
            ts.push_back(i);
            used[i] = true;
            used_position.insert(taxi[i]);
            taxi[i] = not carrying[i] ? passenger[j] : zone[j];
            used_position.insert(taxi[i]);
            if (not carrying[i]) {
                delivered[j] = true;
                count_delivered += 1;
            }
            count_carrying -= carrying[i];
            carrying[i] = not carrying[i];
            count_carrying += carrying[i];
        }
        REP (i, t) if (not used[i]) {
            if (not used_position.count(taxi[i])) {
                used_position.insert(taxi[i]);
                used[i] = true;
            }
        }
        REP (i, t) if (not used[i]) {
            assert (used_position.count(taxi[i]));
            uniform_int_distribution<int> dist(-2, +2);
            for (int iteration = 0; ; ++ iteration) {
                int rdx = uniform_int_distribution<int>(- iteration / 4 - 1, + iteration / 4 + 1)(gen);
                int rdy = uniform_int_distribution<int>(- iteration / 4 - 1, + iteration / 4 + 1)(gen);
                point_t next_taxi = {
                    taxi[i].x + rdx,
                    taxi[i].y + rdy,
                };
                if (not used_position.count(next_taxi)) {
                    used_position.insert(next_taxi);
                    taxi[i] = next_taxi;
                    used[i] = true;
                    result.emplace_back(rdx, rdy, vector<int>(1, i));
                    break;
                }
            }
        }
        result.emplace_back(dx, dy, ts);
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
