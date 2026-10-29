import numpy as np
import pandas as pd

from qbt import data, indicators


def test_read_csv_yahoo_format_adjusts_ohlc(tmp_path):
    f = tmp_path / "x.csv"
    f.write_text("Date,Open,High,Low,Close,Adj Close,Volume\n"
                 "2024-01-02,10,11,9,10,5,100\n2024-01-03,10,12,10,11,5.5,100\n")
    df = data.read_csv(f)
    assert list(df.columns) == data.OHLCV
    assert df["close"].tolist() == [5.0, 5.5]
    assert df["high"].iloc[0] == 5.5


def test_read_csv_german_format(tmp_path):
    f = tmp_path / "x.csv"
    f.write_text("Datum;Eröffnung;Hoch;Tief;Schlusskurs;Volumen\n"
                 "03.01.2024;101,5;102,0;100,0;101,0;1000\n02.01.2024;100,0;101,0;99,5;100,5;1000\n")
    df = data.read_csv(f)
    assert df.index[0] == pd.Timestamp("2024-01-02")
    assert df["close"].tolist() == [100.5, 101.0]


def test_validate_flags_unadjusted_split():
    p = data.synthetic(1, days=100, seed=1)
    s = p.symbols[0]
    p.close.iloc[50:, 0] /= 4
    issues = data.validate(p)
    assert any("Split" in i for i in issues), (s, issues)


def test_panel_alignment_keeps_nan_for_missing_days():
    a = pd.DataFrame({k: [1.0, 2.0, 3.0] for k in data.OHLCV}, index=pd.bdate_range("2024-01-01", periods=3))
    b = a.iloc[[0, 2]]
    p = data.Panel.from_frames({"A": a, "B": b})
    assert np.isnan(p.close["B"].iloc[1])


def test_rsi_bounds_and_donchian_excludes_today():
    p = data.synthetic(1, days=300, seed=9)
    c = p.close.iloc[:, 0]
    r = indicators.rsi(c, 14).dropna()
    assert r.between(0, 100).all()
    up, _ = indicators.donchian(p.high.iloc[:, 0], p.low.iloc[:, 0], 20)
    assert up.iloc[30] == p.high.iloc[10:30, 0].max()


def test_sma_matches_manual():
    s = pd.Series([1.0, 2, 3, 4, 5])
    assert indicators.sma(s, 3).tolist()[2:] == [2.0, 3.0, 4.0]
