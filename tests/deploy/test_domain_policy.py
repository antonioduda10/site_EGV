import importlib.util
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('domain_policy', Path(__file__).resolve().parents[2] / 'deploy/domain-policy.py')
policy = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(policy)
DOMAIN = 'escolagetuliovargas.com.br'


class DomainPolicyTests(unittest.TestCase):
    def ready_lookup(self, server, host, kind):
        if kind == 'NS':
            return [name + '.' for name in policy.NAMESERVERS]
        if kind == 'A':
            return [policy.EXPECTED_IP]
        return []

    def test_valid_canonical_domain(self):
        self.assertEqual(policy.validate_domain(DOMAIN), DOMAIN)

    def test_invalid_domains_are_rejected_before_dns(self):
        for domain in ['https://' + DOMAIN, 'www.' + DOMAIN, DOMAIN + '/path', DOMAIN + ':443', '-bad.example', 'bad..example', '127.0.0.1', DOMAIN + ';id', 'School.example']:
            with self.subTest(domain=domain), self.assertRaises(policy.DomainError):
                policy.check_dns(domain, lambda *args: self.fail('DNS must not run'))

    def test_ready_requires_all_resolvers_and_both_hosts(self):
        self.assertTrue(policy.check_dns(DOMAIN, self.ready_lookup)['ready'])

    def test_old_registrar_nameservers_block_activation(self):
        def lookup(server, host, kind):
            if server in policy.RESOLVERS and kind == 'NS':
                return ['a.auto.dns.br.', 'b.auto.dns.br.']
            return self.ready_lookup(server, host, kind)
        self.assertFalse(policy.check_dns(DOMAIN, lookup)['ready'])

    def test_missing_www_blocks_activation(self):
        def lookup(server, host, kind):
            if host.startswith('www.') and kind == 'A':
                return []
            return self.ready_lookup(server, host, kind)
        self.assertFalse(policy.check_dns(DOMAIN, lookup)['ready'])

    def test_extra_wrong_ipv4_blocks_activation(self):
        def lookup(server, host, kind):
            if kind == 'A':
                return [policy.EXPECTED_IP, '192.0.2.1']
            return self.ready_lookup(server, host, kind)
        self.assertFalse(policy.check_dns(DOMAIN, lookup)['ready'])

    def test_unverified_ipv6_blocks_activation(self):
        def lookup(server, host, kind):
            return ['2001:db8::1'] if kind == 'AAAA' else self.ready_lookup(server, host, kind)
        self.assertFalse(policy.check_dns(DOMAIN, lookup)['ready'])

    def test_caa_allows_http01_and_rejects_other_or_restricted_issuers(self):
        self.assertTrue(policy.caa_allows_http01(['0 issue "letsencrypt.org"']))
        self.assertTrue(policy.caa_allows_http01(['0 issue "letsencrypt.org; validationmethods=http-01,dns-01"']))
        for record in ['0 issue ";"', '0 issue "other.example"', '0 issue "letsencrypt.org; validationmethods=dns-01"', '128 unsupported "value"']:
            with self.subTest(record=record):
                self.assertFalse(policy.caa_allows_http01([record]))

    def test_inherited_caa_is_checked(self):
        def lookup(server, host, kind):
            if host == 'com.br' and kind == 'CAA':
                return ['0 issue ";"']
            return self.ready_lookup(server, host, kind)
        self.assertFalse(policy.check_dns(DOMAIN, lookup)['ready'])

    def test_dns_failure_is_not_treated_as_empty_caa(self):
        with patch.object(policy.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, ';; status: SERVFAIL', '')):
            with self.assertRaises(policy.DomainError):
                policy.query('1.1.1.1', DOMAIN, 'CAA')

    def test_dig_records_are_parsed_without_cname_or_comments(self):
        output = ';; status: NOERROR\nwww.example. 300 IN CNAME example.\nexample. 300 IN A 179.66.135.203\n'
        with patch.object(policy.subprocess, 'run', return_value=subprocess.CompletedProcess([], 0, output, '')):
            self.assertEqual(policy.query('1.1.1.1', DOMAIN, 'A'), [policy.EXPECTED_IP])


if __name__ == '__main__':
    unittest.main()
