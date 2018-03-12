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

struct point_t { int y, x; };
inline bool operator == (point_t const & a, point_t const & b) { return a.y == b.y and a.x == b.x; }
inline bool operator <  (point_t const & a, point_t const & b) { return a.y < b.y or (a.y == b.y and a.x < b.x); }
inline point_t operator + (point_t const & a, point_t const & b) { return (point_t) { a.y + b.y, a.x + b.x }; }
inline point_t operator - (point_t const & a, point_t const & b) { return (point_t) { a.y - b.y, a.x - b.x }; }
inline point_t operator - (point_t const & a) { return (point_t) { - a.y, - a.x }; }
inline point_t & operator += (point_t & a, point_t const & b) { a.y += b.y; a.x += b.x; return a; }
inline point_t & operator -= (point_t & a, point_t const & b) { a.y -= b.y; a.x -= b.x; return a; }
inline double get_dist(point_t const & a, point_t const & b) { return hypot(b.x - a.x, b.y - a.y); }
ostream & operator << (ostream & out, point_t const & a) { return out << "(" << a.y << ", " << a.x << ")"; }
struct point_hash {
    uint64_t operator () (point_t const & a) const {
        return hash<uint64_t>()(((uint64_t)a.y << 32) | a.x);
    }
};

template <typename T>
bool is_unique(vector<T> const & a) {
    REP (i, a.size()) {
        if (find(a.begin() + (i + 1), a.end(), a[i]) != a.end()) {
            return false;
        }
    }
    return true;
}

double calculate_penalty(int dy, int dx, int k, int t) {
    return hypot(dx, dy) * (1 + k /(double) t);
}
double calculate_penalty(vector<point_t> taxi, vector<pair<point_t, vector<int> > > const & moves, int t) {
    double acc = 0;
    for (auto const & move : moves) {
        point_t delta = get<0>(move);
        vector<int> const & ts = get<1>(move);
        acc += calculate_penalty(delta.y, delta.x, ts.size(), t);
        for (int i : ts) {
            taxi[i] += delta;
        }
        if (not is_unique(taxi)) return NAN;
    }
    return acc;
}

int get_nearest(point_t const & a, vector<point_t> const & bs, vector<bool> const & mask) {
    int best_index = -1;
    double best_dist = INFINITY;
    REP (i, bs.size()) if (not mask[i]) {
        double dist = get_dist(a, bs[i]);
        if (dist < best_dist) {
            best_dist = dist;
            best_index = i;
        }
    }
    return best_index;
}


int dir_delta(int dir, point_t delta) {
    switch (dir) {
        case 0: return max(0, + delta.x);
        case 1: return max(0, - delta.y);
        case 2: return max(0, - delta.x);
        case 3: return max(0, + delta.y);
        default: assert (false);
    }
}
point_t dir_amount(int dir, int amount) {
    switch (dir) {
        case 0: return { 0, + amount };
        case 1: return { - amount, 0 };
        case 2: return { 0, - amount };
        case 3: return { + amount, 0 };
        default: assert (false);
    }
}

vector<pair<point_t, vector<int> > > solve(vector<point_t> taxi, vector<point_t> const & passenger, vector<point_t> const & zone) {
    const int t = taxi.size();
    const int p = passenger.size();
    const int z = zone.size();
    default_random_engine gen;
    vector<pair<point_t, vector<int> > > result;
    vector<bool> carrying(taxi.size());
    vector<bool> delivered(passenger.size());
    int count_delivered = 0;

    auto update_taxi = [&](int i) {
        if (not carrying[i]) {
            int j = find(ALL(passenger), taxi[i]) - passenger.begin();
            if (j == p) return;
            if (delivered[j]) return;
            delivered[j] = true;
            count_delivered += 1;
            carrying[i] = true;
        } else {
            int j = find(ALL(zone), taxi[i]) - zone.begin();
            if (j == z) return;
            carrying[i] = false;
        }
    };

    vector<point_t> target_delta(t);
    auto cycle_move = [&]() {
        while (count(ALL(target_delta), (point_t) { 0, 0 }) < t) {
            REP (dir, 4) {
                while (true) {
                    // move
                    int amount = INT_MAX;
                    REP (i, t) {
                        int it = dir_delta(dir, target_delta[i]);
                        if (it == 0) continue;
                        chmin(amount, it);
                    }
                    if (amount == INT_MAX) break;
                    set<point_t> used_points(ALL(taxi));
                    auto delta = dir_amount(dir, amount);
                    vector<int> ts;
                    REP (i, t) {
                        int it = dir_delta(dir, target_delta[i]);
                        if (it == 0) continue;
                        ts.push_back(i);
                        target_delta[i] -= delta;
                        taxi[i] += delta;
                        used_points.insert(taxi[i]);
                    }
                    if (not is_unique(taxi)) {
                        vector<int> ts_complement;
                        REP (i, t) {
                            if (count(ALL(ts), i)) continue;
                            if (count(ALL(taxi), taxi[i]) == 1) continue;
                            int amount = 1;
                            point_t ortho = dir_amount((dir + 3) % 4, amount);
                            while (used_points.count(taxi[i] + ortho)) {
                                ++ amount;
                                ortho = dir_amount((dir + 3) % 4, amount);
                            }
                            taxi[i] += ortho;
                            target_delta[i] -= ortho;
                            result.emplace_back(ortho, vector<int>(1, i));
                            used_points.insert(taxi[i]);
                        }
                    }
                    result.emplace_back(delta, ts);
                    REP (i, t) {
                        update_taxi(i);
                    }
                }
            }
        }
    };

    point_t base = { 0, 0 };
    REP (i, t) {
        point_t target = base + (point_t) { 0, 2 * i };
        target_delta[i] = target - taxi[i];
    }
    cycle_move();
    while (count_delivered < p) {
        {  // go to the base simultaneously
            int j = get_nearest(base, passenger, delivered);
            assert (j != -1);
            point_t delta = passenger[j] - base;
            vector<int> ts(t);
            iota(ALL(ts), 0);
            result.emplace_back(delta, ts);
            REP (i, t) {
                taxi[i] += delta;
                update_taxi(i);
            }
            base = passenger[j];
        }
        { // go to passengers individually
            vector<bool> used = delivered;
            REP (i, t) if (not carrying[i]) {
                int j = get_nearest(base, passenger, used);
                if (j == -1) break;
                used[j] = true;
                point_t target = passenger[j];
                target_delta[i] = target - taxi[i];
            }
        }
        cycle_move();
        // return to the base individually
        REP (i, t) {
            point_t target = base + (point_t) { 0, 2 * i };
            target_delta[i] = target - taxi[i];
        }
        cycle_move();
        {  // go for a zone simultaneously
            int j = get_nearest(base, zone, vector<bool>(z));
            assert (j != -1);
            point_t delta = zone[j] + (point_t) { 0, 1 } - base;
            vector<int> ts(t);
            iota(ALL(ts), 0);
            result.emplace_back(delta, ts);
            REP (i, t) {
                taxi[i] += delta;
                update_taxi(i);
            }
            base = zone[j] + (point_t) { 0, 1 };
        }
        REP (i, t) if (carrying[i]) {  // go to the zone, one by one
            point_t zone_j = base - (point_t) { 0, 1 };
            point_t delta = zone_j - taxi[i];
            result.emplace_back(delta, vector<int>(1, i));
            taxi[i] += delta;
            update_taxi(i);
            result.emplace_back(- delta, vector<int>(1, i));
            taxi[i] -= delta;
            update_taxi(i);
        }
    }
    assert (count(ALL(carrying), 0) == t);
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
        point_t delta = get<0>(move);
        vector<int> const & ts = get<1>(move);
        int k = ts.size();
        printf("MOVE %d %d %d", delta.x, delta.y, k);
        for (int t_i : ts) {
            printf(" %d", t_i + 1);
        }
        printf("\n");
    }
    fprintf(stderr, "penalty: %lf\n", calculate_penalty(taxi, result, t));
    return 0;
}
