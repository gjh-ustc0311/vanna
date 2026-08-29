import pytest

from vanna.integrations.xpd.errors import XpdSqlRejected
from vanna.integrations.xpd.sql_guard import XpdSqlGuard


def test_guard_accepts_approved_select_cte_and_logical_join(schema_evidence):
    guard = XpdSqlGuard(schema_evidence)

    plain = guard.prepare(
        "SELECT item_id, SUM(pay_amt) AS amount "
        "FROM tb_live_goods_daily_stats GROUP BY item_id"
    )
    cte = guard.prepare(
        "WITH totals AS (SELECT item_id, SUM(pay_amt) AS amount "
        "FROM tb_live_goods_daily_stats GROUP BY item_id) "
        "SELECT item_id, amount FROM totals"
    )
    joined = guard.prepare(
        "SELECT g.item_id, e.end_time "
        "FROM tb_live_goods_session_stats AS g "
        "JOIN tb_live_session_endtime_stats AS e "
        "ON g.live_session_id = e.live_session_id"
    )

    assert plain.used_tables == ("tb_live_goods_daily_stats",)
    assert cte.used_tables == ("tb_live_goods_daily_stats",)
    assert set(joined.used_tables) == {
        "tb_live_goods_session_stats",
        "tb_live_session_endtime_stats",
    }


@pytest.mark.parametrize(
    "sql",
    [
        "SELECT item_id FROM tb_live_goods_daily_stats; SELECT 1",
        "DELETE FROM tb_live_goods_daily_stats",
        "SELECT * FROM tb_live_goods_daily_stats",
        "SELECT unknown_column FROM tb_live_goods_daily_stats",
        "SELECT item_id FROM other_table",
        "SELECT item_id FROM other_db.tb_live_goods_daily_stats",
        "SELECT SLEEP(1) FROM tb_live_goods_daily_stats",
        "SELECT /*!50000 SQL_NO_CACHE */ item_id FROM tb_live_goods_daily_stats",
        "SELECT item_id FROM tb_live_goods_daily_stats AS d "
        "JOIN tb_live_goods_session_stats AS s ON d.item_id = s.item_id",
        "SELECT g.item_id FROM tb_live_goods_session_stats AS g "
        "JOIN tb_live_session_endtime_stats AS e "
        "ON g.live_session_id = e.live_session_id OR 1 = 1",
        "SELECT live_session_id FROM tb_live_goods_session_stats AS g "
        "JOIN tb_live_session_endtime_stats AS e "
        "ON g.live_session_id = e.live_session_id",
    ],
)
def test_guard_rejects_unsafe_or_unverifiable_sql(schema_evidence, sql):
    with pytest.raises(XpdSqlRejected):
        XpdSqlGuard(schema_evidence).prepare(sql)


def test_guard_allows_count_star_but_not_projection_star(schema_evidence):
    prepared = XpdSqlGuard(schema_evidence).prepare(
        "SELECT COUNT(*) AS row_count FROM tb_live_goods_daily_stats"
    )
    assert "COUNT(*)" in prepared.sql.upper()
