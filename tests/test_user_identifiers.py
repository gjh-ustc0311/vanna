import pytest

from vanna.core.user.identifiers import MAX_UINT64, is_canonical_uint64


@pytest.mark.parametrize(
    "value",
    ["0", "1", "9223372036854775808", "18446744073709551615"],
)
def test_canonical_uint64_accepts_full_unsigned_range(value):
    assert is_canonical_uint64(value) is True


@pytest.mark.parametrize(
    "value",
    [
        None,
        "",
        "-1",
        "+1",
        "00",
        "01",
        " 1",
        "1 ",
        "1.0",
        "1e3",
        "18446744073709551616",
    ],
)
def test_canonical_uint64_rejects_noncanonical_or_out_of_range_values(value):
    assert is_canonical_uint64(value) is False


def test_uint64_constant_matches_the_protocol_upper_bound():
    assert MAX_UINT64 == 2**64 - 1
