# Generated by Django 4.2.21 on 2025-06-07 12:43

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('legislation', '0001_initial'),
        ('vote', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='BillVoteByParty',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('party', models.CharField(max_length=50)),
                ('agree', models.PositiveIntegerField(default=0)),
                ('oppose', models.PositiveIntegerField(default=0)),
                ('abstain', models.PositiveIntegerField(default=0)),
                ('absent', models.PositiveIntegerField(default=0)),
                ('bill', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='legislation.bill')),
            ],
            options={
                'unique_together': {('bill', 'party')},
            },
        ),
    ]
